import React from 'react';
import { cn } from '@/lib/utils';
import { VariantProps, cva } from 'class-variance-authority';

const buttonVariants = cva(
  'relative group border text-foreground mx-auto text-center rounded-full',
  {
    variants: {
      variant: {
        default: 'bg-blue-500/5 hover:bg-blue-500/0 border-blue-500/20',
        solid: 'bg-blue-500 hover:bg-blue-600 text-white border-transparent hover:border-foreground/50 transition-all duration-200',
        ghost: 'border-transparent bg-transparent hover:border-zinc-600 hover:bg-white/10',
      },
      size: {
        default: 'px-7 py-1.5 ',
        sm: 'px-4 py-0.5 ',
        lg: 'px-10 py-2.5 ',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  neon?: boolean;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, neon = true, size, variant, asChild, children, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size }), className);

    // 顶部/底部发光线，光带在各自线段内无规则流动，悬停时定格
    const lines = (
      <>
        <span
          className={cn(
            'absolute inset-x-0 inset-y-0 mx-auto hidden h-px w-3/4 bg-gradient-to-r from-transparent via-white to-transparent bg-[length:200%_100%] opacity-70 animate-[neon-flow_2.6s_ease-in-out_infinite] transition-opacity duration-300 group-hover:opacity-100 group-hover:[animation-play-state:paused]',
            neon && 'block',
          )}
        />
        <span
          className={cn(
            'absolute inset-x-0 -bottom-px mx-auto hidden h-px w-3/4 bg-gradient-to-r from-transparent via-white to-transparent bg-[length:200%_100%] opacity-40 animate-[neon-flow_2.6s_ease-in-out_infinite_reverse] transition-opacity duration-300 group-hover:opacity-70 group-hover:[animation-play-state:paused]',
            neon && 'block',
          )}
        />
      </>
    );

    // asChild：把发光线注入到链接内部（Radix Slot 只支持单 child，这里用 cloneElement 处理多节点）
    if (asChild) {
      const child = React.Children.only(children) as React.ReactElement<{
        className?: string;
        children?: React.ReactNode;
      }>;
      return React.cloneElement(child, {
        className: cn(child.props.className, classes),
        ...props,
        children: (
          <>
            {lines}
            {child.props.children}
          </>
        ),
      });
    }

    return (
      <button ref={ref} className={classes} {...props}>
        {lines}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants };
