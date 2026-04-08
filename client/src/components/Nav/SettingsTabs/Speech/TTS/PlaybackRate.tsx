import React from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { Slider, InputNumber } from '@librechat/client';
import { cn, defaultTextProps, optionText } from '~/utils';
import useUpdateSetting from '~/hooks/useUpdateSetting';
import { useLocalize } from '~/hooks';
import store from '~/store';

export default function DecibelSelector() {
  const localize = useLocalize();
  const { updateSetting } = useUpdateSetting();
  const textToSpeech = useRecoilValue(store.textToSpeech);
  const [playbackRate, setPlaybackRate] = useRecoilState(store.playbackRate);

  const handlePlaybackRateChange = (value: number | null) => {
    setPlaybackRate(value);
    void updateSetting('speech.tts.playbackRate', value ?? undefined);
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center justify-between">
        <div id="playback-rate-label">{localize('com_nav_playback_rate')}</div>
        <div className="w-2" />
        <small className="opacity-40">
          ({localize('com_endpoint_default_with_num', { 0: '1' })})
        </small>
      </div>
      <div className="flex items-center justify-between">
        <Slider
          value={[playbackRate ?? 1]}
          onValueChange={(value) => handlePlaybackRateChange(value[0])}
          onDoubleClick={() => handlePlaybackRateChange(null)}
          min={0.1}
          max={2}
          step={0.1}
          className="ml-4 flex h-4 w-24"
          disabled={!textToSpeech}
          aria-labelledby="playback-rate-label"
        />
        <div className="w-2" />
        <InputNumber
          value={playbackRate ?? 1}
          disabled={!textToSpeech}
          onChange={(value) => handlePlaybackRateChange(value ? value[0] : null)}
          min={0.1}
          max={2}
          aria-labelledby="playback-rate-label"
          className={cn(
            defaultTextProps,
            cn(
              optionText,
              'reset-rc-number-input reset-rc-number-input-text-right h-auto w-12 border-0 group-hover/temp:border-gray-200',
            ),
          )}
        />
      </div>
    </div>
  );
}
