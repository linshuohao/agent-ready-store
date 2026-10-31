import { Button as Primitive } from '@base-ui/react/button';

export function Button({
  variant = 'default',
  className = '',
  ...props
}: Primitive.Props & { variant?: 'default' | 'outline' }) {
  return (
    <Primitive
      {...props}
      data-size="default"
      data-variant={variant}
      className={`commerce-button ${className}`}
    />
  );
}
