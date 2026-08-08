import next from 'eslint-config-next';

const config = [
  ...next,
  {
    rules: {
      // 提示词组件使用 <img>，保持原样，全局豁免该规则
      '@next/next/no-img-element': 'off',
    },
  },
];

export default config;
