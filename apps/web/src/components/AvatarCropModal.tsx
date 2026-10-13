'use client';

import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { useTranslations } from 'next-intl';
import { Area, getCroppedImg } from '../lib/crop-image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

export interface AvatarCropModalLabels {
  title?: string;
  zoom?: string;
  cancel?: string;
  apply?: string;
  cropError?: string;
}

interface AvatarCropModalProps {
  imageSrc: string;
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob) => void;
  labels?: AvatarCropModalLabels;
}

export function AvatarCropModal({
  imageSrc,
  isOpen,
  onClose,
  onCropComplete,
  labels,
}: AvatarCropModalProps) {
  const tProfile = useTranslations('profile');
  const tCommon = useTranslations('common');

  const resolvedLabels = {
    title: labels?.title ?? tProfile('cropAvatarTitle'),
    zoom: labels?.zoom ?? tProfile('zoom'),
    cancel: labels?.cancel ?? tCommon('cancel'),
    apply: labels?.apply ?? tProfile('applyCrop'),
    cropError: labels?.cropError ?? tProfile('cropError'),
  };

  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropChange = useCallback((newCrop: { x: number; y: number }) => {
    setCrop(newCrop);
  }, []);

  const onZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  const handleCropComplete = useCallback(
    (_croppedArea: Area, currentCroppedAreaPixels: Area) => {
      setCroppedAreaPixels(currentCroppedAreaPixels);
    },
    [],
  );

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    try {
      setIsProcessing(true);
      setError(null);
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, 512);
      onCropComplete(croppedBlob);
      onClose();
    } catch {
      setError(resolvedLabels.cropError);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="z-[70] overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b border-border p-4 text-center">
          <DialogTitle className="text-base font-semibold">
            {resolvedLabels.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {resolvedLabels.title}
          </DialogDescription>
        </DialogHeader>

        <div className="relative h-72 w-full bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={handleCropComplete}
          />
        </div>

        <div className="space-y-4 p-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{resolvedLabels.zoom}</span>
              {/* i18n-audit-ignore: Zoom multiplier suffix */}
              <span>{zoom.toFixed(1)}x</span>
            </div>
            <Slider
              min={1}
              max={3}
              step={0.1}
              value={[zoom]}
              onValueChange={(val) => setZoom(val[0])}
              className="py-1"
            />
          </div>

          {error && (
            <p className="text-center text-xs font-semibold text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="border-t border-border bg-muted/20 p-3 sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isProcessing}
          >
            {resolvedLabels.cancel}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isProcessing || !croppedAreaPixels}
          >
            {isProcessing ? '...' : resolvedLabels.apply}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
