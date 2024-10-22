export class SheetQueryDto {
  logic?: 'and' | 'or';
  rules: Record<string, string | string[] | number | number[]>;
}

export class SheetUpdateDto {
  query: SheetQueryDto;
  update: Record<string, string | number>;
}

export class SheetInsertDto {
  insert: Record<string, string | number>[];
  append?: boolean
}
