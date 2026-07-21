/**
 * @name 工作台账审核
 *
 * 参考资料：
 * - /src/prototypes/problem-library-function-list/index.tsx
 * - /src/prototypes/problem-library-ledger-audit/spec.md
 * - /src/docs/业务页面设计规范.md
 */
import { forwardRef } from 'react';
import Component from '../problem-library-function-list';
import type { AxureHandle, AxureProps } from '../../common/axure-types';

const AuditComponent = forwardRef<AxureHandle, AxureProps>((props, ref) => (
  <Component
    {...props}
    ref={ref}
    config={{
      ...props.config,
      default_feature: 'ledgerAudit',
    }}
  />
));

export default AuditComponent;
