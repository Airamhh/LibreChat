import React from 'react';
import { YamlEditor } from '~/components/Admin';

export default function AdminConfigView() {
  return (
    <div className="container mx-auto flex h-full flex-col p-6">
      <YamlEditor />
    </div>
  );
}
