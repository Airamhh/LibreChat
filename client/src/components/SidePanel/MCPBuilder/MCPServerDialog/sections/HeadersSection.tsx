import { Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Input, Label, Button } from '@librechat/client';
import type { MCPServerFormData } from '../hooks/useMCPServerForm';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

const ENV_VAR_PATTERN = /\$\{[^}]+\}/;

export default function HeadersSection() {
  const localize = useLocalize();
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<MCPServerFormData>();

  const { fields, append, remove } = useFieldArray({ control, name: 'headers' });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{localize('com_ui_mcp_headers')}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ key: '', value: '' })}
          className="h-7 gap-1 px-2 text-xs"
        >
          <Plus className="size-3" aria-hidden="true" />
          {localize('com_ui_mcp_add_header')}
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-light px-3 py-2 text-center text-xs text-text-secondary">
          {localize('com_ui_mcp_no_headers')}
        </p>
      ) : (
        <div className="space-y-2 rounded-lg border border-border-light p-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-2">
              <div className="flex-1 space-y-1">
                <Input
                  placeholder={localize('com_ui_mcp_header_key_placeholder')}
                  aria-label={localize('com_ui_mcp_header_key')}
                  aria-invalid={errors.headers?.[index]?.key ? 'true' : 'false'}
                  {...register(`headers.${index}.key`, {
                    required: localize('com_ui_field_required'),
                  })}
                  className={cn(
                    'text-xs',
                    errors.headers?.[index]?.key && 'border-border-destructive',
                  )}
                />
                {errors.headers?.[index]?.key && (
                  <p role="alert" className="text-xs text-text-destructive">
                    {errors.headers[index].key?.message}
                  </p>
                )}
              </div>
              <div className="flex-1 space-y-1">
                <Input
                  placeholder={localize('com_ui_mcp_header_value_placeholder')}
                  aria-label={localize('com_ui_mcp_header_value')}
                  aria-invalid={errors.headers?.[index]?.value ? 'true' : 'false'}
                  {...register(`headers.${index}.value`, {
                    required: localize('com_ui_field_required'),
                    validate: (v) =>
                      !ENV_VAR_PATTERN.test(v) || localize('com_ui_mcp_header_env_var_not_allowed'),
                  })}
                  className={cn(
                    'text-xs',
                    errors.headers?.[index]?.value && 'border-border-destructive',
                  )}
                />
                {errors.headers?.[index]?.value && (
                  <p role="alert" className="text-xs text-text-destructive">
                    {errors.headers[index].value?.message}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(index)}
                className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-destructive"
                aria-label={localize('com_ui_delete')}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
