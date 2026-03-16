import path from 'path';

export const MAKE_STATE_DIR = path.join('.axhub', 'make');
export const MAKE_CONFIG_RELATIVE_PATH = path.join(MAKE_STATE_DIR, 'axhub.config.json');
export const MAKE_DEV_SERVER_INFO_RELATIVE_PATH = path.join(MAKE_STATE_DIR, '.dev-server-info.json');
export const MAKE_ENTRIES_RELATIVE_PATH = path.join(MAKE_STATE_DIR, 'entries.json');
export const AXURE_BRIDGE_BASE_URL = 'http://localhost:32767';
