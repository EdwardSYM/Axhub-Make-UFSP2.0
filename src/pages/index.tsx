/**
 * @name 按钮
 * 
 * 参考资料：
 * - /rules/development-standards.md
 * - /assets/libraries/tailwind-css.md
 */

import './style.css';
import React, { forwardRef, useImperativeHandle } from 'react';
import type { AxureProps, AxureHandle } from '../common/axure-types';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[] 组件渲染错误:', error);
    console.error('[] 错误详情:', errorInfo);
    console.error('[] 错误堆栈:', error.stack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', border: '2px solid red', margin: '20px' }}>
          <h2>组件渲染失败: 按钮</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
            {this.state.error?.toString()}
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

const Component = forwardRef<AxureHandle, AxureProps>(function (innerProps, ref) {
  console.log('[] 组件开始渲染');
  
  useImperativeHandle(ref, function () {
    return {
      getVar: function () { return undefined; },
      fireAction: function () {},
      eventList: [],
      actionList: [],
      varList: [],
      configList: [],
      dataList: []
    };
  }, []);

  // 动态注入外部资源
  React.useEffect(function () {
    const injected: (HTMLElement)[] = [];
    
    // 注入 links
    [{"href":"style.css","rel":"stylesheet","crossorigin":false}].forEach(function (linkInfo: any) {
      const existing = document.querySelector(`link[href="${linkInfo.href}"]`);
      if (!existing) {
        const link = document.createElement('link');
        link.rel = linkInfo.rel;
        link.href = linkInfo.href;
        if (linkInfo.crossorigin) link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
        injected.push(link);
      }
    });
    
    return function () {
      injected.forEach(function (el) {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
    };
  }, []);

  console.log('[] 准备返回 JSX');
  
  try {
    return (
      <body className="style_1 block relative font-normal text-left border-0 visible mt-0 -mr-96 mb-0 ml-0 p-0 overflow-visible" style={{ width: '1788px', height: '1465px' }}></body>
    );
  } catch (error) {
    console.error('[] JSX 渲染错误:', error);
    throw error;
  }
});

const WrappedComponent = forwardRef<AxureHandle, AxureProps>((props, ref) => (
  <ErrorBoundary>
    <Component {...props} ref={ref} />
  </ErrorBoundary>
));

export default WrappedComponent;
