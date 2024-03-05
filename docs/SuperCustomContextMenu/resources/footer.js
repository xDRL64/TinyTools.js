(()=>{
    let s;
    let c = `(C) [free licience] - All Code Examples are highlighted with Prism.js`;
    const {body} = document;

    // footer elem
    const footer = document.createElement('div');
    s = footer.style;
    s.position = 'fixed';
    s.display = 'flex';
    s.flexDirection = 'row-reverse';
    s.bottom = '0px';
    s.width = '100%';
    s.left = '0px';
    s.backgroundColor = 'white';
    s.borderTop = '1px solid black';

    // footer content elem
    const content = document.createElement('span');
    s = content.style;
    s.padding = '2px 16px';

    // add footer to page
    content.textContent = c;
    footer.appendChild(content);
    body.appendChild(footer);

    // generate footer's bounding space
    // (fixes footer overlapping on page's content at end of scroll)
    const footerHeight = footer.getBoundingClientRect().height;
    const bodyMargin = parseInt(getComputedStyle(body).marginBottom);
    const boundHeight = footerHeight - bodyMargin;
    const heightBound = document.createElement('div');
    s = heightBound.style;
    s.position = 'relative';
    s.inset = 'auto 0px 0px 0px';
    s.height = boundHeight + 'px';
    body.appendChild(heightBound);
})();