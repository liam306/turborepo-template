import { FileExtensionValidator } from './file-extension.validator';

describe('FileExtensionValidator', () => {
  const validator = new FileExtensionValidator({
    allowedExtensions: ['json', 'csv', 'xlsx', 'xls'],
  });

  it('should accept valid file extensions', () => {
    expect(
      validator.isValid({
        originalname: 'questions.csv',
      } as Express.Multer.File),
    ).toBe(true);
    expect(
      validator.isValid({
        originalname: 'questions.XLSX',
      } as Express.Multer.File),
    ).toBe(true);
    expect(
      validator.isValid({
        originalname: 'data.backup.json',
      } as Express.Multer.File),
    ).toBe(true);
    expect(
      validator.isValid({ originalname: 'bank.xls' } as Express.Multer.File),
    ).toBe(true);
  });

  it('should reject invalid file extensions', () => {
    expect(
      validator.isValid({ originalname: 'script.exe' } as Express.Multer.File),
    ).toBe(false);
    expect(
      validator.isValid({
        originalname: 'document.pdf',
      } as Express.Multer.File),
    ).toBe(false);
    expect(
      validator.isValid({ originalname: 'image.png' } as Express.Multer.File),
    ).toBe(false);
    expect(
      validator.isValid({ originalname: 'noextension' } as Express.Multer.File),
    ).toBe(false);
  });

  it('should reject missing or empty files', () => {
    expect(validator.isValid(undefined)).toBe(false);
    expect(validator.isValid({ originalname: '' } as Express.Multer.File)).toBe(
      false,
    );
  });

  it('should generate formatted error message', () => {
    expect(validator.buildErrorMessage()).toContain('.json, .csv, .xlsx, .xls');
  });
});
