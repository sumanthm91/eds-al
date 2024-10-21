import React, { FC } from 'react';
import './TextArea.css';

interface TextProps {
  label: string;
  name: string;
  placeholder?: string,
  handler?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  required?: boolean;
}

const TextArea: FC<TextProps> = ({ label, name, placeholder=null, handler, required = true }) => {
  return (
    <fieldset>
      <label>
        <span className='label'>{label}</span>
        <textarea name={name} placeholder={placeholder} onChange={handler} required={required} />
      </label>
    </fieldset>
  );
};

export default TextArea;
