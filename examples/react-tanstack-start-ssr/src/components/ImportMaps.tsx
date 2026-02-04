import {importMapRaw} from 'virtual:importmap';

export function ImportMapsScript() {
  return <script type="importmap">{importMapRaw}</script>;
}