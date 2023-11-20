import { Injectable, Inject } from '@nestjs/common';
import { ConfigService} from "@nestjs/config";
import { SheetUpdateDto, SheetQueryDto } from "./dto/sheet-update.dto";
import axios from 'axios';
import {GoogleSpreadsheet, GoogleSpreadsheetRow, GoogleSpreadsheetWorksheet} from 'google-spreadsheet';
import { JWT, OAuth2Client } from 'google-auth-library'
import { backOff } from "exponential-backoff";
import {SheetsService} from "./sheets/sheets.service";
import {Cache} from "cache-manager";
import {CACHE_MANAGER} from "@nestjs/cache-manager";
import { Sheet } from './sheets/sheet.entity';

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
  private readonly oauthClient: OAuth2Client;

  constructor(
      private configService: ConfigService,
      private sheetService: SheetsService,
      @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {
    this.oauthClient = new OAuth2Client({
      clientId: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
    });
    this.oauthClient.on('tokens', async (tokens)=> {
      const decoded = JSON.parse(atob(tokens.id_token.split('.')[1]));
      console.log('oauth tokens!', decoded.email);
      // @ts-ignore
      await this.cacheManager.set('token:'+decoded.sub, tokens, { ttl: Math.floor((tokens.expiry_date - (new Date()).getTime()) / 1000 ) } );
    })
  }

  async revokeToken(token) {
    await this.oauthClient.revokeToken(token);
  }

  async getAuthMethod(uid: string) {
    //console.log('client_email', this.configService.get('service_account').client_email)

    let cacheKey = 'sheet:'+uid;
    let theSheet: Sheet = await this.cacheManager.get(cacheKey);
    if(!theSheet) {
      theSheet = await this.sheetService.findOneWithOptions({
        relations: ['user'],
        where: {uid: uid}
      });
      // @ts-ignore
      await this.cacheManager.set(cacheKey, theSheet, {ttl: 30});
    } else {
      console.log('cache hit', cacheKey);
    }

    cacheKey = 'token:'+theSheet.user.sub;
    if(theSheet.user.access_method==='service_account') {
      if( !(theSheet.user.service_account && theSheet.user.service_account.client_email
          && theSheet.user.service_account.private_key) ) {
          //throw {'message': 'missing service account info', statusCode: 401}
        console.log('missing service account info, attempting with default.')
        //console.log('service account', this.configService.get('service_account'))
        theSheet.user.service_account.client_email = this.configService.get('service_account').client_email;
        theSheet.user.service_account.private_key = this.configService.get('service_account').private_key;
      }
      const serviceAccountAuth = new JWT({
        email: theSheet.user.service_account.client_email,
        key: theSheet.user.service_account.private_key,
        scopes: SCOPES,
      });

      serviceAccountAuth.on('tokens', async (tokens)=> {
        console.log('service_account tokens!', tokens);
        // @ts-ignore
        await this.cacheManager.set(cacheKey, tokens, { ttl: Math.floor((tokens.expiry_date - (new Date()).getTime()) / 1000 ) } );
      });

      const tokens: any = await this.cacheManager.get(cacheKey);
      if(tokens) {
        const tokenTTL = (tokens.expiry_date - (new Date()).getTime()) / 1000;
        console.log('cache hit', cacheKey, tokenTTL);
        if(tokenTTL < 30) {
          console.log('less than 30s TTL, refreshing....');
          return (await serviceAccountAuth.getAccessToken()).token;
        }
        return tokens.access_token;
      }

      return (await serviceAccountAuth.getAccessToken()).token;
    }

    if(theSheet.user.access_method==='oauth') {
      this.oauthClient.setCredentials({
        refresh_token: theSheet.user.refresh_token
      });

      let tokens: any = await this.cacheManager.get(cacheKey);
      if(tokens) {
        const tokenTTL = (tokens.expiry_date - (new Date()).getTime()) / 1000;
        console.log('cache hit', cacheKey, tokenTTL);
        if(tokenTTL < 3500) {
          console.log('less than 30s TTL, refreshing....');
          tokens = await this.oauthClient.getAccessToken();
          return tokens.token;
        }

        return tokens.access_token;
      }
      tokens = await this.oauthClient.getAccessToken();
      //console.log('token', await this.cacheManager.get(cacheKey))

      return tokens.token;
    }
  }

  async getSheet(uid: string, sheetName: string|null): Promise<GoogleSpreadsheetWorksheet> {
    const serviceAccountAuth = await this.getAuthMethod(uid);
    let cacheKey = 'sheet:'+uid;
    let theSheet: Sheet = await this.cacheManager.get(cacheKey);
    if(!theSheet) {
      theSheet = await this.sheetService.findOneWithOptions({
        relations: ['user'],
        where: {uid: uid}
      });
      // @ts-ignore
      await this.cacheManager.set(cacheKey, theSheet, {ttl: 30});
    } else {
      console.log('hit cache', 'sheet:' + uid)
    }

    let doc;
    try {
      doc = new GoogleSpreadsheet(theSheet.sheet_id, {token: serviceAccountAuth});
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

  async getAllRows(uid: string, sheetName: string|null, limit: number|null, offset: number|null): Promise<Record<string, any>[]> {
    let cacheKey = 'allRows:'+uid;
    try {
      let allRows: any = await this.cacheManager.get(cacheKey);
      if(allRows) {
        console.log('cache hit', 'allRows:'+uid);
        return allRows;
      }

      const response = [];
      const sheet = await this.getSheet(uid, sheetName);

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
      // @ts-ignore
      await this.cacheManager.set(cacheKey, response, {ttl: 15} );
      return response;
    } catch (e) {
      throw e;
    }
  }

  async search(uid: string, sheetName: string|null, predicates: any, andOr = 'and') {
    console.log(predicates);
    const response = [];

    const sheet = await this.getSheet(uid, sheetName);

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

  async update(uid: string, sheetName: string|null, query: SheetQueryDto, update: Record<string, string|number>) {
    let rowsUpdated = 0;
    const rowsToUpdate = [];
    const rowsToSave = [];

    const sheet = await this.getSheet(uid,sheetName);
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
    //const serviceAccountAuth = await this.getAuthMethod(uid);
    const bearerToken = await this.getAuthMethod(uid);
    console.log('sheetId', sheet.sheetId);
    const response = await backOff(() => axios.request({
      url: `https://sheets.googleapis.com/v4/spreadsheets/${sheet._spreadsheet.spreadsheetId}/values:batchUpdate`,
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
        throw {message: "Error accessing Google Sheets API."+e.message, statusCode: status};
      }
    });
    await this.cacheManager.del('allRows:'+uid);
    //res.send(`${rowsUpdated} rows updated`);
    return {
      "totalUpdatedRows": response.data.totalUpdatedRows,
      "totalUpdatedColumns": response.data.totalUpdatedColumns,
      "totalUpdatedCells": response.data.totalUpdatedCells
    };
  }

  /**
   *
   * @param uid
   * @param sheetName
   * @param insert
   */
  async insert(uid: string, sheetName: string|null, insert: Record<string, string|number>[]) {
    const sheet = await this.getSheet(uid, sheetName);
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

    const bearerToken = await this.getAuthMethod(uid);

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
        url: `https://sheets.googleapis.com/v4/spreadsheets/${sheet._spreadsheet.spreadsheetId}:batchUpdate`,
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
    await this.cacheManager.del('allRows:'+uid);
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
      url: `https://sheets.googleapis.com/v4/spreadsheets/${sheet._spreadsheet.spreadsheetId}/values:batchUpdate`,
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

  async delete(uid: string, sheetName: string|null, query: SheetQueryDto) {
    const rowsToDelete = [];
    let rowsDeleted = 0;
    const deletePayload = {
      requests: []
    }

    const sheet = await this.getSheet(uid,sheetName);
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

    const bearerToken = await this.getAuthMethod(uid);
    const response = await backOff(() => axios.request({
      url: `https://sheets.googleapis.com/v4/spreadsheets/${sheet._spreadsheet.spreadsheetId}:batchUpdate`,
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
    await this.cacheManager.del('allRows:'+uid);
    return {rowsDeleted: rowsDeleted};
  }

}
