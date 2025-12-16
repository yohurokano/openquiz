import { getAvatarClass, getInitials } from '../lib/utils';

type AvatarProps = {
  name: string;
  size?: 'small' | 'medium' | 'large';
};

export default function Avatar({ name, size = 'medium' }: AvatarProps) {
  const sizeClass = size === 'small' ? 'small' : size === 'large' ? 'large' : '';
  
  return (
    <div className={`playerAvatar ${getAvatarClass(name)} ${sizeClass}`}>
      {getInitials(name)}
    </div>
  );
}
