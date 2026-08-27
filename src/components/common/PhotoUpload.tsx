import { useRef } from 'react'
import { Camera, ImagePlus, X } from 'lucide-react'
import { cn, fileToDataUrl } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/**
 * Photo evidence input. Files are read as data URLs and kept in app state, so
 * nothing is uploaded anywhere — the images survive a refresh via localStorage.
 */
export function PhotoUpload({
  images,
  onChange,
  label = 'Photos',
  hint,
  emptyTitle = 'Add photos',
  emptyMessage,
  max = 6,
  className,
  tone = 'default',
}: {
  images: string[]
  onChange: (next: string[]) => void
  label?: string
  hint?: string
  emptyTitle?: string
  emptyMessage?: string
  max?: number
  className?: string
  tone?: 'default' | 'danger'
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  const add = async (files: FileList | null) => {
    if (!files?.length) return
    const urls = await Promise.all(Array.from(files).slice(0, max).map(fileToDataUrl))
    onChange([...images, ...urls].slice(0, max))
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.8125rem] font-medium">
          {label}
          <span className="ml-1.5 text-2xs font-normal text-muted-foreground">
            {images.length}/{max}
            {hint ? ` · ${hint}` : ''}
          </span>
        </p>
        {images.length > 0 && images.length < max && (
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <ImagePlus />
            Add
          </Button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void add(e.target.files)}
      />

      {images.length === 0 ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={cn(
            'mt-2.5 flex w-full flex-col items-center gap-1.5 rounded-xl border border-dashed px-4 py-6 text-center transition-colors',
            tone === 'danger'
              ? 'border-destructive/30 bg-destructive-soft/40 hover:border-destructive/50'
              : 'border-border bg-muted/30 hover:border-primary/40 hover:bg-primary-soft/40',
          )}
        >
          <Camera
            className={cn('size-5', tone === 'danger' ? 'text-destructive' : 'text-muted-foreground')}
          />
          <span className="text-[0.8125rem] font-medium">{emptyTitle}</span>
          {emptyMessage && (
            <span className="max-w-xs text-2xs leading-relaxed text-muted-foreground">
              {emptyMessage}
            </span>
          )}
        </button>
      ) : (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {images.map((src, i) => (
            <div key={i} className="relative">
              <img
                src={src}
                alt={`${label} ${i + 1}`}
                className="size-20 rounded-lg border border-border object-cover"
              />
              <button
                type="button"
                aria-label={`Remove photo ${i + 1}`}
                onClick={() => onChange(images.filter((_, j) => j !== i))}
                className="absolute -right-1.5 -top-1.5 inline-flex size-5 items-center justify-center rounded-full bg-ink text-white shadow-sm transition-transform hover:scale-105"
              >
                <X className="size-3" strokeWidth={3} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
