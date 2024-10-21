import {
  fetchPlaceholdersForLocale, createModal, openModal,
} from '../../scripts/scripts.js';
import { getAPCCustomerData, getAPCTierProgressData } from '../../scripts/hellomember/api.js';

function updateProgress(
  currentPoints,
  maxPoints,
  progressBarFront,
  circles,
  points,
  isPlusMember,
  interval,
) {
  let progressPercentage;

  if (interval === undefined || interval === null) {
    if (isPlusMember) {
      progressBarFront.style.width = '100%';
      circles.forEach((circle, index) => {
        if (index === 0) {
          circle.classList.add('start-circle');
          circle.classList.remove('end-circle');
          circle.classList.toggle('filled', currentPoints >= Math.max(...points));
        } else if (index === 1) {
          circle.classList.add('end-circle');
          circle.classList.remove('start-circle');
          circle.classList.toggle('filled', currentPoints >= Math.max(...points));
        } else {
          circle.classList.add('hidden');
        }
      });
    }
    return;
  }

  if (isPlusMember) {
    const adjustedPoints = currentPoints % interval;
    progressPercentage = (adjustedPoints / interval) * 100;
    progressBarFront.style.width = `${Math.min(progressPercentage, 100)}%`;

    circles.forEach((circle, index) => {
      if (index === 0) {
        circle.classList.add('start-circle');
        circle.classList.remove('end-circle');
        circle.classList.toggle('filled', adjustedPoints >= 0);
      } else if (index === 1) {
        circle.classList.add('end-circle');
        circle.classList.remove('start-circle');
        circle.classList.toggle('filled', adjustedPoints === interval);
      } else {
        circle.classList.add('hidden');
      }
    });
    return;
  }

  progressPercentage = (currentPoints / maxPoints) * 100;
  progressBarFront.style.width = `${Math.min(progressPercentage, 100)}%`;
  circles.forEach((circle, index) => {
    circle.classList.remove('hidden');
    circle.classList.toggle('filled', currentPoints >= points[index]);
  });
}

export default async function decorate(block) {
  const {
    helloMemberPoints: helloMemberPointsPlaceholder,
    helloMemberViewButtonLabel, helloMemberPlusLabel,
    memberidTextPlaceholder, modalTitleQrCode,
  } = await fetchPlaceholdersForLocale();

  const memberDataPromise = getAPCCustomerData();
  const tierProgressDataPromise = getAPCTierProgressData();

  const [memberData, tierProgressData] = await Promise.all([
    memberDataPromise, tierProgressDataPromise]);

  if (!tierProgressData || !tierProgressData.extension_attributes) return;

  const { extension_attributes: { interval } } = tierProgressData;
  const predefinedPoints = interval ? Array.from({ length: 3 }, (_, i) => (i + 1) * interval) : [];
  const points = [...predefinedPoints, Math.max(...predefinedPoints)];
  const maxPoints = Math.max(...points);
  const isPlusMember = memberData.apc_points >= Math.max(...predefinedPoints);

  const mainDiv = document.createElement('div');
  mainDiv.classList.add('point-block');

  if (isPlusMember) {
    const plusMemberDiv = document.createElement('div');
    plusMemberDiv.textContent = helloMemberPlusLabel || 'Plus Member';
    plusMemberDiv.classList.add('progress-label', 'plus-member');
    mainDiv.appendChild(plusMemberDiv);
  }

  const heading = document.createElement('h5');
  const pointsText = helloMemberPointsPlaceholder || '{{}} Points';
  heading.textContent = `${pointsText.replace('{{}}', memberData.apc_points)}`;
  heading.classList.add('heading-text');
  mainDiv.appendChild(heading);

  const progressContainer = document.createElement('div');
  progressContainer.classList.add('my-tier-progress');

  if (!isPlusMember) {
    const startContent = document.createElement('div');
    startContent.textContent = tierProgressData.extension_attributes.current_tier;
    startContent.classList.add('progress-label', 'start-label');
    progressContainer.appendChild(startContent);
  }
  const progressWrapper = document.createElement('div');
  progressWrapper.classList.add('progress-wrapper');
  const progressBarBack = document.createElement('div');
  progressBarBack.classList.add('tier-bar-back');
  const progressCircles = document.createElement('ul');
  progressCircles.classList.add('progress-circles');
  const isRtl = document.documentElement.getAttribute('dir') === 'rtl';

  const circles = [];
  if (isPlusMember) {
    // Only two circles for Plus Members (start and end)
    const startCircle = document.createElement('li');
    startCircle.classList.add('progress-circle', 'filled');
    startCircle.style.left = '0%';
    progressCircles.appendChild(startCircle);
    circles.push(startCircle);
    const endCircle = document.createElement('li');
    endCircle.classList.add('progress-circle');
    endCircle.style.right = '0%';
    progressCircles.appendChild(endCircle);
    circles.push(endCircle);
  } else {
    // For non-Plus Members, create circles at each milestone
    points.forEach((point) => {
      const circle = document.createElement('li');
      circle.classList.add('progress-circle');
      if (isRtl) {
        circle.style.right = `${(point / maxPoints) * 100}%`;
      } else {
        circle.style.left = `${(point / maxPoints) * 100}%`;
      }
      progressCircles.appendChild(circle);
      circles.push(circle);
    });
  }
  progressBarBack.appendChild(progressCircles);
  const progressBarFront = document.createElement('div');
  progressBarFront.classList.add('tier-bar-front');
  progressBarFront.style.width = `${(memberData.apc_points / maxPoints) * 100}%`;
  progressBarBack.appendChild(progressBarFront);
  progressWrapper.appendChild(progressBarBack);
  progressContainer.appendChild(progressWrapper);

  if (!isPlusMember) {
    const endContent = document.createElement('div');
    endContent.textContent = tierProgressData.extension_attributes.next_tier;
    endContent.classList.add('progress-label', 'end-label');
    progressContainer.appendChild(endContent);
  }
  mainDiv.appendChild(progressContainer);

  const paragraph = document.createElement('p');
  paragraph.textContent = tierProgressData.extension_attributes.points_summary;
  paragraph.classList.add('info-paragraph');
  mainDiv.appendChild(paragraph);

  const button = document.createElement('button');
  button.textContent = helloMemberViewButtonLabel || 'VIEW MEMBER ID';
  button.classList.add('secondary');
  button.addEventListener('click', async () => {
    import('../../scripts/render.qrcode.js').then(async (module) => {
      const modalContent = document.createElement('div');
      modalContent.classList.add('member-qr-content');

      const memberIDText = document.createElement('p');
      memberIDText.textContent = memberidTextPlaceholder || 'Your Member ID';
      memberIDText.classList.add('modal-member-id-text');
      modalContent.appendChild(memberIDText);

      const qrCode = document.createElement('div');
      qrCode.id = 'qrcode';
      qrCode.classList.add('modal-qrcode');
      modalContent.appendChild(qrCode);

      const memberID = document.createElement('p');
      memberID.textContent = `${memberData.apc_identifier_number}`;
      memberID.classList.add('modal-member-id-number');
      modalContent.appendChild(memberID);

      await createModal('member-id-modal', modalTitleQrCode || 'QR Code', modalContent.outerHTML, ['member-id-modal-qr']);
      module.qrcode(document.getElementById('qrcode'), memberData.apc_identifier_number);
      openModal('member-id-modal');
    });
  });
  mainDiv.appendChild(button);

  const id = document.createElement('p');
  id.textContent = memberData.apc_identifier_number;
  id.classList.add('member-id');
  mainDiv.appendChild(id);

  updateProgress(
    memberData.apc_points,
    maxPoints,
    progressBarFront,
    circles,
    points,
    isPlusMember,
    interval,
  );
  block.innerHTML = '';
  block.appendChild(mainDiv);
}
