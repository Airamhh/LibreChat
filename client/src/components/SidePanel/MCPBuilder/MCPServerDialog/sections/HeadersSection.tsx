import { useState } from 'react';
import { Plus, Trash2, Lock, LockOpen, ChevronDown } from 'lucide-react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import {
  Input,
  Label,
  Button,
  SecretInput,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@librechat/client';
import type { MCPServerFormData, CustomUserVarEntry } from '../hooks/useMCPServerForm';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

const ENV_VAR_PATTERN = /\$\{[^}]+\}/;

interface HeaderRowProps {
  index: number;
  onRemove: () => void;
  availableVars: CustomUserVarEntry[];
}

function HeaderRow({ index, onRemove, availableVars }: HeaderRowProps) {
  const localize = useLocalize();
  const {
    register,
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext<MCPServerFormData>();

  const [showVarMenu, setShowVarMenu] = useState(false);

  const isSecret = useWatch<MCPServerFormData, `headers.${number}.isSecret`>({
    name: `headers.${index}.isSecret`,
  });

  const insertVariable = (varKey: string) => {
    const current = getValues(`headers.${index}.value`) ?? '';
    setValue(`headers.${index}.value`, `${current}{{${varKey}}}`, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setShowVarMenu(false);
  };

  const toggleSecret = () => {
    setValue(`headers.${index}.isSecret`, !isSecret, { shouldDirty: true });
    if (isSecret) {
      // Switching from secret → non-secret: clear the masked/empty value so user enters new one
      setValue(`headers.${index}.value`, '', { shouldDirty: true });
    }
  };

  return (
    <div className="flex items-start gap-1.5">
      {/* Key input */}
      <div className="w-2/5 space-y-1">
        <Input
          placeholder={localize('com_ui_mcp_header_key_placeholder')}
          aria-label={localize('com_ui_mcp_header_key')}
          aria-invalid={errors.headers?.[index]?.key ? 'true' : 'false'}
          {...register(`headers.${index}.key`, {
            required: localize('com_ui_field_required'),
          })}
          className={cn('text-xs', errors.headers?.[index]?.key && 'border-border-destructive')}
        />
        {errors.headers?.[index]?.key && (
          <p role="alert" className="text-xs text-text-destructive">
            {errors.headers[index].key?.message}
          </p>
        )}
      </div>

      {/* Value input (regular or secret) + optional variable picker */}
      <div className="flex min-w-0 flex-1 items-start gap-1">
        <div className="flex-1 space-y-1">
          {isSecret ? (
            <SecretInput
              placeholder={localize('com_ui_mcp_header_value_secret_placeholder')}
              aria-label={localize('com_ui_mcp_header_value')}
              aria-invalid={errors.headers?.[index]?.value ? 'true' : 'false'}
              {...register(`headers.${index}.value`, {
                validate: (v) =>
                  !ENV_VAR_PATTERN.test(v) || localize('com_ui_mcp_header_env_var_not_allowed'),
              })}
              className={cn(
                'text-xs',
                errors.headers?.[index]?.value && 'border-border-destructive',
              )}
            />
          ) : (
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
          )}
          {errors.headers?.[index]?.value && (
            <p role="alert" className="text-xs text-text-destructive">
              {errors.headers[index].value?.message}
            </p>
          )}
        </div>

        {/* Variable picker — only for non-secret headers with available vars */}
        {!isSecret && availableVars.length > 0 && (
          <DropdownMenu open={showVarMenu} onOpenChange={setShowVarMenu}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="mt-0.5 flex h-9 shrink-0 items-center gap-0.5 rounded border border-border-light px-1.5 text-xs text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
                aria-label={localize('com_ui_mcp_insert_variable')}
                title={localize('com_ui_mcp_insert_variable')}
              >
                <span className="max-w-[3.5rem] truncate font-mono leading-none">
                  {'{{…}}'}
                </span>
                <ChevronDown className="size-3 shrink-0" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[160] min-w-[10rem]">
              {availableVars.map(({ key, title }) => (
                <DropdownMenuItem
                  key={key}
                  onSelect={() => insertVariable(key)}
                  className="cursor-pointer gap-2 text-xs"
                >
                  <span className="font-mono text-text-secondary">{`{{${key}}}`}</span>
                  <span className="text-text-primary">{title}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Secret toggle */}
      <button
        type="button"
        onClick={toggleSecret}
        className={cn(
          'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded border transition-colors',
          isSecret
            ? 'border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-400 dark:hover:bg-amber-900'
            : 'border-border-light text-text-secondary hover:bg-surface-hover hover:text-text-primary',
        )}
        aria-label={
          isSecret ? localize('com_ui_mcp_mark_not_secret') : localize('com_ui_mcp_mark_secret')
        }
        aria-pressed={!!isSecret}
        title={isSecret ? localize('com_ui_mcp_mark_not_secret') : localize('com_ui_mcp_mark_secret')}
      >
        {isSecret ? (
          <Lock className="size-3.5" aria-hidden="true" />
        ) : (
          <LockOpen className="size-3.5" aria-hidden="true" />
        )}
      </button>

      {/* Delete */}
      <button
        type="button"
        onClick={onRemove}
        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-destructive"
        aria-label={localize('com_ui_delete')}
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

export default function HeadersSection() {
  const localize = useLocalize();
  const { control } = useFormContext<MCPServerFormData>();

  const { fields, append, remove } = useFieldArray({ control, name: 'headers' });

  const availableVars = useWatch<MCPServerFormData, 'customUserVars'>({
    name: 'customUserVars',
    defaultValue: [],
  });

  const validVars = (availableVars ?? []).filter((v) => v.key.trim() && v.title.trim());

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{localize('com_ui_mcp_headers')}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ key: '', value: '', isSecret: false })}
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
            <HeaderRow
              key={field.id}
              index={index}
              onRemove={() => remove(index)}
              availableVars={validVars}
            />
          ))}
        </div>
      )}
    </div>
  );
}
