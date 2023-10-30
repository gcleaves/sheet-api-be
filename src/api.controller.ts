import {
  Controller,
  Get,
  Param,
  Req,
  Patch,
  Body,
  Put,
  Delete,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiService } from './api.service';
import { ConfigService } from '@nestjs/config';
import {
  SheetInsertDto,
  SheetQueryDto,
  SheetUpdateDto,
} from './dto/sheet-update.dto';

@Controller('/api')
export class ApiController {
  constructor(
    private readonly apiService: ApiService,
    private configService: ConfigService,
  ) {}

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

    const predicates = { ...request.query };
    delete predicates._sheet;

    return this.apiService.search(params.sheetId, sheet, predicates, 'and');
  }

  @Get(':sheetId/search_or')
  search_or(@Param() params: any, @Req() request: Request): Record<string, any> {
    const sheet: string = request.query._sheet as string;

    const predicates = {...request.query};
    delete predicates._sheet;

    return this.apiService.search(params.sheetId, sheet, predicates, 'or');
  }

  @Patch(':sheetId')
  update(@Param() params: any, @Req() request: Request, @Body() body: SheetUpdateDto): any {
    const sheetName: string = request.query._sheet as string;
    const query = body.query;
    const update = body.update;

    return this.apiService.update(params.sheetId, sheetName, query, update);
  }

  @Put(':sheetId')
  insert(@Param() params: any, @Req() request: Request, @Body() body: SheetInsertDto): any {
    const sheetName: string = request.query._sheet as string;
    return this.apiService.insert(params.sheetId, sheetName, body.insert);
  }

  @Delete(':sheetId')
  delete(@Param() params: any, @Req() request: Request, @Body() query: SheetQueryDto): any {
    const sheetName: string = request.query._sheet as string;
    return this.apiService.delete(params.sheetId, sheetName, query);
  }
}
