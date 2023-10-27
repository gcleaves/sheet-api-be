import { Controller, Get, Param, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiService } from './api.service';
import { ConfigService } from '@nestjs/config';

@Controller('/api')
export class ApiController {
  constructor(private readonly apiService: ApiService, private configService: ConfigService) {}

  @Get(':sheetId')
  getAllRows(@Param() params: any, @Req() request: Request): Promise<Record<string, any>> {
    const sheet: string = request.query._sheet as string;
    const limit: number = +request.query._limit as number;
    const offset: number = +request.query._offset as number;

    return this.apiService.getAllRows(params.sheetId, sheet, limit, offset);
  }

  @Get(':sheetId/search')
  search(@Param() params: any, @Req() request: Request): any {
    const sheet: string = request.query._sheet as string;

    const predicates = {...request.query};
    delete predicates._sheet;

    return this.apiService.search(params.sheetId, sheet, predicates, 'and');
  }

  @Get(':sheetId/search_or')
  search_or(@Param() params: any, @Req() request: Request): any {
    const sheet: string = request.query._sheet as string;

    const predicates = {...request.query};
    delete predicates._sheet;

    return this.apiService.search(params.sheetId, sheet, predicates, 'or');
  }
}
