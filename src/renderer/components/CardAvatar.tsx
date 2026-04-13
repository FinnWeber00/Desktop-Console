import { useEffect, useState } from 'react';

type CardAvatarProps = {
  name: string;
  icon?: string | null;
  className: string;
  labelClassName?: string;
  imageClassName?: string;
};

const fallbackLabel = (name: string): string => name.trim().slice(0, 1).toUpperCase() || '#';

export const CardAvatar = ({
  name,
  icon,
  className,
  labelClassName = '',
  imageClassName = '',
}: CardAvatarProps) => {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [icon]);

  return (
    <div className={className}>
      {icon && !imageFailed ? (
        <img
          alt={name}
          className={imageClassName || 'h-full w-full rounded-inherit object-cover'}
          onError={() => setImageFailed(true)}
          src={icon}
        />
      ) : (
        <span className={labelClassName}>{fallbackLabel(name)}</span>
      )}
    </div>
  );
};
