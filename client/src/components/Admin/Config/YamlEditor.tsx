import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dataService } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import { useUpdateAdminConfigMutation } from '~/data-provider/Admin';

export default function YamlEditor() {
  const localize = useLocalize();
  const [yamlContent, setYamlContent] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const updateConfig = useUpdateAdminConfigMutation();

  const { data, isLoading, isError } = useQuery(
    ['adminConfig'],
    () => dataService.getAdminConfig(),
    { refetchOnWindowFocus: false, retry: false },
  );

  useEffect(() => {
    if (data?.yaml) {
      setYamlContent(data.yaml);
    }
  }, [data]);

  const handleSave = async () => {
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await updateConfig.mutateAsync(yamlContent);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(localize('com_admin_save_error'));
    }
  };

  return (
    <div className="flex h-full flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-token-text-primary">
          {localize('com_admin_yaml_editor')}
        </h2>
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="text-sm text-green-500">{localize('com_ui_saved')}</span>
          )}
          {saveError && <span className="text-sm text-red-500">{saveError}</span>}
          <button
            onClick={handleSave}
            disabled={updateConfig.isLoading}
            className="rounded bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {updateConfig.isLoading ? localize('com_ui_saving') : localize('com_ui_save')}
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="text-sm text-token-text-secondary">{localize('com_ui_loading')}</div>
      )}
      {isError && (
        <div className="text-sm text-red-500">{localize('com_admin_config_load_error')}</div>
      )}
      {!isLoading && (
        <textarea
          value={yamlContent}
          onChange={(e) => setYamlContent(e.target.value)}
          className="flex-1 rounded border border-border-medium bg-surface-primary p-3 font-mono text-sm text-token-text-primary focus:outline-none"
          rows={30}
          spellCheck={false}
          aria-label={localize('com_admin_yaml_editor')}
        />
      )}

      <p className="text-xs text-token-text-tertiary">{localize('com_admin_yaml_warning')}</p>
    </div>
  );
}
