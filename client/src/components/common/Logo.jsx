import logoUrl from '../../assets/logo-sena.png';

export function Logo({ className = 'h-12' }) {
  return <img src={logoUrl} alt="Logo SENA" className={className} />;
}
