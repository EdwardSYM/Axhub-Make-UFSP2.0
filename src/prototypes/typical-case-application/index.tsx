/**
 * @name 典型案例管理-申请
 *
 * 复用案例库（AI改造）页面框架，固定进入典型案例申请功能。
 */
import React, { forwardRef } from 'react';
import CaseLibraryAi from '../case-library-ai';
import type { AxureHandle, AxureProps } from '../../common/axure-types';

const FEATURE_KEY = 'typical_case_application';

function syncFeatureQuery() {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  if (url.searchParams.get('feature') === FEATURE_KEY) return;

  url.searchParams.set('feature', FEATURE_KEY);
  window.history.replaceState(window.history.state, '', `${url.pathname}?${url.searchParams.toString()}${url.hash}`);
}

syncFeatureQuery();

const Component = forwardRef<AxureHandle, AxureProps>(function Component(props, ref) {
  syncFeatureQuery();
  return <CaseLibraryAi {...props} ref={ref} />;
});

export default Component;
