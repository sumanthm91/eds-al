import React, { FC } from 'react';

interface RadioProps {
  label: string;
  name: string;
  handler: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Radio: FC<RadioProps> = ({ label, name, handler }) => {
  return (
    <label>
      <input type="radio" name={name} onChange={handler} />
      <span className='label'>{label}</span>
    </label>
  );
};

export default Radio;
