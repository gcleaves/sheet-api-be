import { Injectable } from '@nestjs/common';
import {ConfigService} from "@nestjs/config";
import axios from 'axios';
import {GoogleSpreadsheet, GoogleSpreadsheetRow} from 'google-spreadsheet';
import { JWT } from 'google-auth-library'
import { backOff } from "exponential-backoff";

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
        throw new Error('andOr');
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
  readonly serviceAccountAuth;

  constructor(private configService: ConfigService) {
    this.serviceAccountAuth = new JWT({
      email: configService.get('service_account.client_email'),
      key: configService.get('service_account.private_key'),
      scopes: SCOPES,
    });
  }

  async getSheet(sheetId: string, sheetName: string|null) {
    let doc;
    try {
      doc = new GoogleSpreadsheet(sheetId, this.serviceAccountAuth);
      await doc.loadInfo();
    } catch (e) {
      throw {message: e.message, statusCode: e.toJSON().status};
      //return next(e);
    }
    const sheet = (sheetName) ? doc.sheetsByTitle[sheetName] : doc.sheetsByIndex[0];
    if(!sheet) throw {message: `Sheet ${sheetName} not found.`, statusCode: 404};
    return sheet;
  }

  async getAllRows(sheetId: string, sheetName: string|null, limit: number|null, offset: number|null): Promise<Record<string, any>[]> {
    try {
      const response = [];
      const sheet = await this.getSheet(sheetId, sheetName);

      const rows: [GoogleSpreadsheetRow] = await backOff(() => sheet.getRows({ limit, offset}), {
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

    const rows: [GoogleSpreadsheetRow] = await backOff(() => sheet.getRows()); // can pass in
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

}
