import React from 'react';

const createMotionComponent = (Tag) => {
  return React.forwardRef(({ initial, animate, exit, transition, whileHover, whileTap, layout, layoutId, variants, style, custom, drag, dragConstraints, whileInView, viewport, ...props }, ref) => {
    // We pass style through, but strip the framer-motion specific props
    return <Tag ref={ref} style={style} {...props} />;
  });
};

export const motion = {
  div: createMotionComponent('div'),
  span: createMotionComponent('span'),
  h1: createMotionComponent('h1'),
  h2: createMotionComponent('h2'),
  h3: createMotionComponent('h3'),
  p: createMotionComponent('p'),
  button: createMotionComponent('button'),
  ul: createMotionComponent('ul'),
  li: createMotionComponent('li'),
  a: createMotionComponent('a'),
  svg: createMotionComponent('svg'),
  path: createMotionComponent('path'),
};

export const AnimatePresence = ({ children }) => {
  return <>{children}</>;
};
