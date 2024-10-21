import React, { FC } from 'react';

interface TextProps {
  label: string;
  name: string;
  placeholder?: string,
  handler: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}

const Text: FC<TextProps> = ({ label, name, placeholder=null, handler, required = true }) => {
  return (
    <fieldset>
      <label>
        <span className='label'>{label}</span>
        <input type="text" name={name} placeholder={placeholder} onChange={handler} required={required} />
      </label>
    </fieldset>
  );
};

export default Text;
