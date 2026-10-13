import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export type LogoSize = 'sm' | 'md' | 'lg' | 'xl';

export interface LogoProps {
  size?: LogoSize | number;
  showText?: boolean;
  className?: string;
  textClassName?: string;
}

const sizeConfig: Record<LogoSize, { size: number }> = {
  sm: { size: 36 },
  md: { size: 48 },
  lg: { size: 64 },
  xl: { size: 96 },
};

export function Logo({ size = 'md', className }: LogoProps) {
  const t = useTranslations('common');
  const dimension = typeof size === 'number' ? size : sizeConfig[size].size;

  return (
    <div className={cn('inline-flex items-center select-none', className)}>
      <Image
        src="/logo.png"
        alt={t('appName')}
        width={dimension}
        height={dimension}
        className="shrink-0 object-contain"
        priority
      />
    </div>
  );
}
