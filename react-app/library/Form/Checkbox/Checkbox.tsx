import React, { FC } from 'react';

interface CheckboxProps {
  label: string;
  name: string;
  handler: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}

const Checkbox: FC<CheckboxProps> = ({ label, name, handler }) => {
  return (
    <label>
      <input type="checkbox" name={name} onChange={handler} />
      <span className='label'>{label}</span>
    </label>
  );
};

export default Checkbox;
