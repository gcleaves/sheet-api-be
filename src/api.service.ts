import { Injectable, Inject } from '@nestjs/common';
import { ConfigService} from "@nestjs/config";
import { SheetUpdateDto, SheetQueryDto } from "./dto/sheet-update.dto";
import axios from 'axios';
import {GoogleSpreadsheet, GoogleSpreadsheetRow, GoogleSpreadsheetWorksheet} from 'google-spreadsheet';
import { JWT } from 'google-auth-library'
import { backOff } from "exponential-backoff";
import {SheetsService} from "./sheets/sheets.service";
import { OAuth2Client } from 'google-auth-library';
import {Cache} from "cache-manager";
import {CACHE_MANAGER} from "@nestjs/cache-manager";

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets'
];

function evaluateRow(row, predicates, andOr = 'and') {
  let includeRow = (andOr === 'and');
  const r = row.toObject();
  r._rowNumber = row._rowNumber;
  for(const [key,value] of Object.entries(predicates)) {
    const vals = (Array.isArray(value)) ? value : [value];
    for(const v of vals) {
      let op, test;
      switch (v[0]) {
        case '>':
          if(v[1]==='=') {
            op = '>=';
            test = fixNumber(v.slice(2));
          } else {
            op = '>';
            test = fixNumber(v.slice(1));
          }
          break;
        case '<':
          if(v[1]==='=') {
            op = '<=';
            test = fixNumber(v.slice(2));
          } else {
            op = '<';
            test = fixNumber(v.slice(1));
          }
          break;
        case '!':
          op = '!=';
          test = fixNumber(v.slice(1));
          break;
        default:
          op = '=';
          test = fixNumber(v);
      }

      if(andOr==='and') {
        if(! operators[op](r[key], test)) {
          return false;
        }
      } else if (andOr==='or') {
        if(operators[op](r[key], test)) {
          return true;
        }
      } else {
        throw {message: `Logic must be 'and' or 'or', not '${andOr}'`, statusCode: 400}
        //throw new Error('andOr');
      }
    }
  }

  return includeRow;
}

const operators = {
  '<': function(a, b) { return a < b },
  '<=': function(a, b) { return a <= b },
  '>': function(a, b) { return a > b },
  '>=': function(a, b) { return a >= b },
  '=': function(a, b) { return a == b },
  '!=': function(a, b) { return a != b },
};

function fixNumber(item) {
  return (isNaN(item)) ? item : +item;
}

function columnToLetter(column) {
  var temp, letter = '';
  while (column > 0)
  {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}

@Injectable()
export class ApiService {
  constructor(
      private configService: ConfigService,
      private sheetService: SheetsService,
      @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  async getAuthMethod(sheetId: string) {
    const theSheet = await this.sheetService.findOneWithOptions({
      relations: ['user'],
      where: {sheet_id: sheetId},
      select: {
        user: {
          access_method: true,
          refresh_token: true,
          service_account: true
        }
      }
    });
    if(theSheet.user.access_method==='service_account') {
      const serviceAccountAuth = new JWT({
        email: theSheet.user.service_account.client_email,
        key: theSheet.user.service_account.private_key,
        scopes: SCOPES,
      });
      return serviceAccountAuth;
    }
    if(theSheet.user.access_method==='oauth') {
      const oauthClient = new OAuth2Client({
        clientId: this.configService.get<string>('GOOGLE_CLIENT_ID'),
        clientSecret: this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      });
      oauthClient.setCredentials({
        refresh_token: theSheet.user.refresh_token
      });
      return oauthClient;
    }
  }

  async getSheet(sheetId: string, sheetName: string|null): Promise<GoogleSpreadsheetWorksheet> {
    const serviceAccountAuth = await this.getAuthMethod(sheetId);
    serviceAccountAuth.on('tokens', (tokens)=> {
      console.log('tokens!', tokens);
    })

    let doc;
    try {
      doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
      await backOff(()=>doc.loadInfo(),
          {
            retry: (e, attemptNumber) => {
              if(e.code==429) return true;
              throw e;
            }
          });
      //await doc.loadInfo();
    } catch (e) {
      console.error(e);
      let message = e.message;
      if(e.response && e.response.data) {
        message = e.response.data;
      }
      throw {message: message, statusCode: 500}; //
    }
    const sheet = (sheetName) ? doc.sheetsByTitle[sheetName] : doc.sheetsByIndex[0];
    if(!sheet) throw {message: `Sheet ${sheetName} not found.`, statusCode: 404};
    return sheet;
  }

  async getAllRows(sheetId: string, sheetName: string|null, limit: number|null, offset: number|null): Promise<Record<string, any>[]> {
    try {
      const response = [];
      const sheet = await this.getSheet(sheetId, sheetName);

      const rows: GoogleSpreadsheetRow[] = await backOff(() => sheet.getRows({ limit, offset}), {
        numOfAttempts: 5,
        startingDelay: 500,
        retry: (e, attemptNumber) => {
          const status = e.toJSON().status;
          if(status===429) {
            console.log('429 backoff attempt: ' + attemptNumber);
            return true;
          }
          throw {message: `Error accessing Google Sheets API.`, statusCode: status};
        }
      });

      for(const row of rows) {
        const r = row.toObject();

        let rowHasValues = false;
        for(const h of sheet.headerValues) {
          if(r[h] === undefined) {
            r[h]="";
          } else {
            rowHasValues = true;
          }
        }
        r._rowNumber = row.rowNumber;
        if(rowHasValues) response.push(r);
      }
      return response;
    } catch (e) {
      throw e;
    }
  }

  async search(sheetId: string, sheetName: string|null, predicates: any, andOr = 'and') {
    console.log(predicates);
    const response = [];

    const sheet = await this.getSheet(sheetId, sheetName);

    const rows: GoogleSpreadsheetRow[] = await backOff(() => sheet.getRows()); // can pass in
    for(const row of rows) {
      const r = row.toObject();
      const test = evaluateRow(row, predicates, andOr);
      if(!test) continue;

      let rowHasValues = false;
      for(const h of sheet.headerValues) {
        if(r[h] === undefined) {
          r[h]="";
        } else {
          rowHasValues = true;
        }
      }
      r._rowNumber = row.rowNumber;
      if(rowHasValues) response.push(r);
    }

    return response;
  }

  async update(sheetId: string, sheetName: string|null, query: SheetQueryDto, update: Record<string, string|number>) {
    let rowsUpdated = 0;
    const rowsToUpdate = [];
    const rowsToSave = [];

    const sheet = await this.getSheet(sheetId,sheetName);
    const rows: GoogleSpreadsheetRow[] = await backOff(() => sheet.getRows());
    const headerValues = sheet.headerValues;
    console.dir(headerValues, {depth: 10});
    for(const row of rows) {
      const r = row.toObject();
      const test = evaluateRow(row, query.rules, query.logic);
      if(!test) continue;

      console.log('updating row', r, 'with', update);
      rowsToUpdate.push(row);
      rowsUpdated++;
    }

    const payload = {
      valueInputOption: "USER_ENTERED",
      data: []
    }

    for(const r of rowsToUpdate) {
      console.log(r._rowNumber);
      const R1 = r._rowNumber;
      const R2 = r._rowNumber;
      const C1 = 1;
      const C2 = headerValues.length;

      const R1range = `${sheet.title}!R${R1}C${C1}:R${R2}C${C2}`;
      const A1range = `${sheet.title}!${columnToLetter(C1)}${R1}:${columnToLetter(C2)}${R1}`;
      const values = [];
      for(const [k,v] of headerValues.entries()) {
        let value = null;
        if(v) {
          value = update[v] || null;
        }
        values.push(value);
      }

      console.log(R1range, A1range);
      console.log(values);
      const rangePayload = {
        range: A1range,
        majorDimension: 'ROWS',
        values: [
          values
        ]
      }
      payload.data.push(rangePayload);
    }
    console.dir(payload, {depth: 5});
    const serviceAccountAuth = await this.getAuthMethod(sheetId);
    const bearerToken = (await serviceAccountAuth.getAccessToken()).token;
    const response = await backOff(() => axios.request({
      url: `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`,
      method: 'post',
      headers: {
        Authorization: 'Bearer ' + bearerToken
      },
      data: payload
    }), {
      numOfAttempts: 5,
      startingDelay: 1000,
      jitter: "full",
      retry: (e, attemptNumber) => {
        const status = e.toJSON().status;
        if(status===429) {
          console.log('429 backoff attempt: ' + attemptNumber);
          return true;
        }
        throw {message: "Error accessing Google Sheets API.", statusCode: status};
      }
    });
    //res.send(`${rowsUpdated} rows updated`);
    return {
      "totalUpdatedRows": response.data.totalUpdatedRows,
      "totalUpdatedColumns": response.data.totalUpdatedColumns,
      "totalUpdatedCells": response.data.totalUpdatedCells
    };
  }

  /**
   *
   * @param sheetId
   * @param sheetName
   * @param insert
   */
  async insert(sheetId: string, sheetName: string|null, insert: Record<string, string|number>[]) {
    const sheet = await this.getSheet(sheetId, sheetName);
    const rows: GoogleSpreadsheetRow[] = await sheet.getRows();
    const headerValues = sheet.headerValues;
    let maxRow = 1;
    for(const row of rows) {
      const r = row.toObject();

      let rowHasValues = false;
      for(const h of headerValues) {
        if(r[h] === undefined) {
          r[h]="";
        } else {
          rowHasValues = true;
        }
      }
      r._rowNumber = row.rowNumber;
      maxRow = Math.max(maxRow, r._rowNumber);
    }
    //console.log('maxRow', maxRow, 'rowCount', sheet.rowCount);
    //console.log('body', insert);

    const serviceAccountAuth = await this.getAuthMethod(sheetId);
    const bearerToken = (await serviceAccountAuth.getAccessToken()).token;
    // add rows if necessary
    if((maxRow + insert.length) > sheet.rowCount) {
      console.log("need new rows");
      const payload = {
        "requests": [
          {
            "appendDimension": {
              "sheetId": sheet.sheetId,
              "dimension": "ROWS",
              "length": maxRow + insert.length - sheet.rowCount + 100
            }
          }
        ]
      }

      const response = await backOff(() => axios.request({
        url: `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
        method: 'post',
        headers: {
          Authorization: 'Bearer ' + bearerToken
        },
        data: payload
      }), {
        numOfAttempts: 5,
        startingDelay: 500,
        retry: (e, attemptNumber) => {
          const status = e.toJSON().status;
          if(status===429) {
            console.log('429 backoff attempt: ' + attemptNumber);
            return true;
          }
          throw {message: "Error accessing Google Sheets API: " + e.message, statusCode: status}
        }
      });
    }

    const payload = {
      valueInputOption: "USER_ENTERED",
      data: []
    }
    for(const r of insert) {
      maxRow++;
      const R1 = maxRow;
      const R2 = maxRow;
      const C1 = 1;
      const C2 = headerValues.length;

      const R1range = `${sheet.title}!R${R1}C${C1}:R${R2}C${C2}`;
      const A1range = `${sheet.title}!${columnToLetter(C1)}${R1}:${columnToLetter(C2)}${R1}`;
      const values = [];
      for(const [k,v] of headerValues.entries()) {
        let value = null;
        if(v) {
          value = r[v] || null;
        }
        values.push(value);
      }

      //console.log(R1range, A1range);
      //console.log(values);
      const rangePayload = {
        range: A1range,
        majorDimension: 'ROWS',
        values: [
          values
        ]
      }
      payload.data.push(rangePayload);
    }
    console.dir(payload, {depth: 5});

    const response = await backOff(() => axios.request({
      url: `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`,
      method: 'post',
      headers: {
        Authorization: 'Bearer ' + bearerToken
      },
      data: payload
    }), {
      numOfAttempts: 5,
      startingDelay: 500,
      retry: (e, attemptNumber) => {
        const status = e.toJSON().status;
        if(status===429) {
          console.log('429 backoff attempt: ' + attemptNumber);
          return true;
        }
        throw {message: "Error accessing Google Sheets API: " + e.message, statusCode: status}
      }
    });

    if(response.data.totalUpdatedRows) {
      return `${response.data.totalUpdatedRows} rows inserted`;
    } else {
      throw {message: "No rows were inserted", statusCode: 400};
    }
  }

  async delete(sheetId: string, sheetName: string|null, query: SheetQueryDto) {
    const rowsToDelete = [];
    let rowsDeleted = 0;
    const deletePayload = {
      requests: []
    }

    const sheet = await this.getSheet(sheetId,sheetName);
    const rows: GoogleSpreadsheetRow[] = await backOff(() => sheet.getRows());
    const headerValues = sheet.headerValues;
    console.dir(headerValues, {depth: 10});
    for(const row of rows) {
      const test = evaluateRow(row, query.rules, query.logic);
      if(!test) continue;

      rowsToDelete.push(row);
      rowsDeleted++;

      const rowPayload = {
        "deleteDimension": {
          "range": {
            "sheetId": row._worksheet.sheetId,
            "dimension": "ROWS",
            "startIndex": row.rowNumber-1,
            "endIndex": row.rowNumber
          }
        }
      }
      deletePayload.requests.push(rowPayload);
    }

    if(!rowsDeleted) return {rowsDeleted: 0};

    // sort from high to low
    deletePayload.requests.sort((a,b) => {
      return b.deleteDimension.range.startIndex - a.deleteDimension.range.startIndex;
    });

    console.dir(deletePayload, {depth: 5});

    const serviceAccountAuth = await this.getAuthMethod(sheetId);
    const bearerToken = (await serviceAccountAuth.getAccessToken()).token;
    const response = await backOff(() => axios.request({
      url: `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
      method: 'post',
      headers: {
        Authorization: 'Bearer ' + bearerToken
      },
      data: deletePayload
    }), {
      numOfAttempts: 5,
      startingDelay: 500,
      retry: (e, attemptNumber) => {
        const status = e.toJSON().status;
        const message = e.toJSON().message;
        let extraInfo;
        if(e.response && e.response.data && e.response.data.error) extraInfo = e.response.data.error.message;

        if(status===429) {
          console.log('429 backoff attempt: ' + attemptNumber);
          return true;
        }
        console.dir(e.response,{depth: 5});
        throw {message: `Error accessing Google Sheets API: ${message} ${extraInfo}`, statusCode: status};
      }
    });

    return {rowsDeleted: rowsDeleted};
  }

}
