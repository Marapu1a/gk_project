import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RegistryCard } from './RegistryCard';

describe('RegistryCard certificate logos', () => {
  it.each([
    ['Инструктор', 'IBT'],
    ['Супервизор', 'IBA'],
    ['Опытный Супервизор', 'IBA'],
    ['Опытный супервизор', 'IBA'],
  ])('shows the appropriate logo for active %s', (groupName, logo) => {
    const html = renderToStaticMarkup(
      <RegistryCard id="1" fullName="Специалист" groupName={groupName} certificateStatus="ACTIVE" />,
    );
    expect(html).toContain(`src="/icons/${logo}.png"`);
  });

  it.each(['SUSPENDED', 'GRACE_EXPIRED', null, undefined] as const)(
    'does not show a logo for certificate status %s', (certificateStatus) => {
      const html = renderToStaticMarkup(
        <RegistryCard id="1" fullName="Специалист" groupName="Супервизор" certificateStatus={certificateStatus} />,
      );
      expect(html).not.toContain('/icons/IBA.png');
    },
  );

  it.each(['Куратор', 'Соискатель', 'Неизвестная группа'])('does not badge %s', (groupName) => {
    const html = renderToStaticMarkup(
      <RegistryCard id="1" fullName="Специалист" groupName={groupName} certificateStatus="ACTIVE" />,
    );
    expect(html).not.toMatch(/\/icons\/IB[AT]\.png/);
  });

  it('does not show a logo in applicant cards', () => {
    const html = renderToStaticMarkup(
      <RegistryCard id="1" fullName="Соискатель" groupName="Супервизор" certificateStatus="ACTIVE" variant="applicant" />,
    );
    expect(html).not.toContain('/icons/IBA.png');
  });
});
