/* eslint-disable import/no-cycle */
import { createModalFromContent, openModal } from '../scripts.js';
import { setupOtpValidation, sendOtp, verifyOtp } from '../forms.js';

export default async function openOtpVerificationModal(
  phoneInput,
  countryIso,
  resendCounter,
  placeholders,
) {
  const OTP_VERIFICATION = 'otp-verification-dialog';
  const modalOtp = document.createElement('div');
  modalOtp.classList.add('otp-verification-container');

  const otpContainerTitle = placeholders.sentOtpModalTitle || 'Verify';
  const otpContainerInnerTitleText = document.createElement('p');
  otpContainerInnerTitleText.textContent = placeholders.sentOtpModalText || 'Please enter the OTP sent to';

  const otpContainerInnercountryIso = document.createElement('span');
  otpContainerInnercountryIso.textContent = `+${countryIso}${phoneInput.value}`;
  otpContainerInnerTitleText.append(otpContainerInnercountryIso);

  modalOtp.appendChild(otpContainerInnerTitleText);

  const otpFieldsContainer = document.createElement('div');
  otpFieldsContainer.classList.add('otp-fields-container');

  for (let i = 0; i < 6; i += 1) {
    const otpInputContainer = document.createElement('div');
    otpInputContainer.classList.add('otp-input-container');
    const otpInput = document.createElement('input');
    otpInput.type = 'text';
    otpInput.classList.add('otp-input');
    otpInput.autocomplete = 'one-time-code';
    otpInput.inputMode = 'numeric';
    otpInput.maxLength = 1;
    otpInput.pattern = '\\d{1}';

    const line = document.createElement('div');
    line.classList.add('line');

    otpInputContainer.appendChild(otpInput);
    otpInputContainer.appendChild(line);
    otpFieldsContainer.appendChild(otpInputContainer);

    otpInput.addEventListener('input', () => {
      if (this.value.trim() !== '') {
        this.nextElementSibling.style.display = 'none';
      } else {
        this.nextElementSibling.style.display = 'block';
      }
    });
  }
  modalOtp.appendChild(otpFieldsContainer);

  const otpMessageContainer = document.createElement('p');
  otpMessageContainer.textContent = placeholders.invalidOtpMessage || 'Please enter a valid OTP';
  otpMessageContainer.classList.add('otp-message-container');
  modalOtp.appendChild(otpMessageContainer);

  const otpVerifyButton = document.createElement('button');
  otpVerifyButton.textContent = placeholders.otpVerifyButtonText || 'Verify';
  otpVerifyButton.classList.add('otp-verify-button');
  otpVerifyButton.disabled = true;
  modalOtp.appendChild(otpVerifyButton);

  const resendCodeText = document.createElement('p');
  resendCodeText.textContent = placeholders.resendCodeText || 'Not received the code?';
  const resendCode = document.createElement('a');
  resendCode.href = '';
  resendCode.textContent = placeholders.resendCode || 'Resend Code';
  resendCode.classList.add('resend-code');
  resendCodeText.appendChild(resendCode);
  modalOtp.appendChild(resendCodeText);

  await createModalFromContent(
    OTP_VERIFICATION,
    otpContainerTitle,
    modalOtp.outerHTML,
    [OTP_VERIFICATION],
  );
  openModal(OTP_VERIFICATION);

  const otpInputs = document.querySelectorAll('.otp-input');
  otpInputs.forEach((input) => {
    input.addEventListener('input', (event) => {
      event.target.value = event.target.value.replace(/\D/g, '');
    });
  });

  const otpLine = document.querySelectorAll('.line');
  const otpVerifyButtonField = document.querySelector('.otp-verify-button');

  setupOtpValidation(otpInputs, otpVerifyButtonField, otpLine);

  otpVerifyButtonField.addEventListener('click', async (event) => {
    event.preventDefault();
    const otp = Array.from(otpInputs).map((i) => i.value).join('');
    await verifyOtp(countryIso, phoneInput, otp, placeholders);
  });

  document.querySelector('.resend-code').addEventListener('click', async (event) => {
    event.preventDefault();
    await sendOtp(phoneInput, countryIso, resendCounter, placeholders);
  });
}
