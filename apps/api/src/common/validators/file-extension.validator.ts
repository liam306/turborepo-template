import { FileValidator } from '@nestjs/common';

export interface FileExtensionValidatorOptions {
  allowedExtensions: string[];
}

export class FileExtensionValidator extends FileValidator<FileExtensionValidatorOptions> {
  isValid(file?: Express.Multer.File): boolean {
    if (!file || !file.originalname) {
      return false;
    }
    const parts = file.originalname.split('.');
    if (parts.length < 2) {
      return false;
    }
    const ext = parts.pop()?.toLowerCase();
    if (!ext) {
      return false;
    }
    return this.validationOptions.allowedExtensions
      .map((e) => e.replace(/^\./, '').toLowerCase())
      .includes(ext);
  }

  buildErrorMessage(): string {
    const formatted = this.validationOptions.allowedExtensions
      .map((ext) => (ext.startsWith('.') ? ext : `.${ext}`))
      .join(', ');
    return `Validation failed (expected file extension among: ${formatted})`;
  }
}
