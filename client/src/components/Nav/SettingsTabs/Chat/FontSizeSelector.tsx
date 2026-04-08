import { useAtom } from 'jotai';
import { Dropdown } from '@librechat/client';
import { fontSizeAtom } from '~/store/fontSize';
import useUpdateSetting from '~/hooks/useUpdateSetting';
import { useLocalize } from '~/hooks';

export default function FontSizeSelector() {
  const localize = useLocalize();
  const [fontSize, setFontSize] = useAtom(fontSizeAtom);
  const { updateSetting } = useUpdateSetting();

  const handleChange = (val: string) => {
    setFontSize(val);
    void updateSetting('fontSize', val);
  };

  const options = [
    { value: 'text-xs', label: localize('com_nav_font_size_xs') },
    { value: 'text-sm', label: localize('com_nav_font_size_sm') },
    { value: 'text-base', label: localize('com_nav_font_size_base') },
    { value: 'text-lg', label: localize('com_nav_font_size_lg') },
    { value: 'text-xl', label: localize('com_nav_font_size_xl') },
  ];

  const labelId = 'font-size-selector-label';

  return (
    <div className="flex w-full items-center justify-between">
      <div id={labelId}>{localize('com_nav_font_size')}</div>
      <Dropdown
        value={fontSize}
        options={options}
        onChange={handleChange}
        testId="font-size-selector"
        sizeClasses="w-[150px]"
        className="z-50"
        aria-labelledby={labelId}
      />
    </div>
  );
}
