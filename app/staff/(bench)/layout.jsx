import StaffShell from './StaffShell';

export const metadata = { title: 'The bench — Soul Restoration' };

export default function BenchLayout({ children }) {
  return <StaffShell>{children}</StaffShell>;
}
