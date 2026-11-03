import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { CommunityMarkdown } from '@/components/community/community-markdown';

test('renders markdown emphasis, headings, and lists as readable text', () => {
  render(
    <CommunityMarkdown>
      {'## 养护建议\n\n保持 **土壤微湿**。\n\n- 明亮散射光\n- 避免积水'}
    </CommunityMarkdown>,
  );

  expect(screen.getByText('养护建议')).toBeTruthy();
  expect(screen.getByText('土壤微湿')).toBeTruthy();
  expect(screen.getByText('明亮散射光')).toBeTruthy();
  expect(screen.getByText('避免积水')).toBeTruthy();
});
