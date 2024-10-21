let twoColLayout = false;

export default function decorate(block) {
  if (block.classList.contains('two-col')) {
    twoColLayout = true;
  }
  const ol = document.createElement('ol');
  ol.classList.add('steps-list');

  // setup image and text classes
  [...block.children].forEach((row, idx) => {
    [...row.children].forEach((cli) => {
      const pic = cli.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          // picture is only content in cliumn
          picWrapper.classList.add('step-icon');
        }
      } else {
        cli.classList.add('step-text');
      }
    });

    const stepnumber = idx + 1;

    const stepContentDiv = document.createElement('div');
    stepContentDiv.classList.add('step-content');
    stepContentDiv.innerHTML = row.innerHTML;
    row.innerHTML = '';
    row.appendChild(stepContentDiv);
    row.classList.add('step-item');
    const div = document.createElement('div');
    div.classList.add('step-number');
    div.innerHTML = stepnumber;

    if (twoColLayout) {
      const iconEl = row.querySelector('.step-icon');
      iconEl.remove();
      row.appendChild(iconEl);
      const stepText = row.querySelector('.step-text');
      const stepContent = row.querySelector('.step-content');
      stepContent.insertBefore(div, stepText);
    } else {
      row.insertBefore(div, row.firstChild);
    }

    const li = document.createElement('li');
    li.appendChild(row);
    ol.appendChild(li);
  });

  block.innerHTML = '';
  block.appendChild(ol);
}
