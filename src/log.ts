// ## Log
// 
// it's handy to be able to log things
interface Log {
  error(...message: any): any;
  log(...message: any): any;
  warn(...message: any): any;
}

// one simple log class is a wrapper around a native `console`
function createConsoleLog(): Log {
  return {
    error: console.error.bind(console),
    log: console.log.bind(console),
    warn: console.warn.bind(console),
  };
}

// a log class that outputs whatever the last thing was to an HTML element
function createHtmlLogReplacement(root: HTMLElement) {
  const span = (thing: string) => {
    const s = createElement<HTMLSpanElement>('span');
    s.innerHTML = thing;

    return s;
  };
  const log = (...stuff: any[]) => {
    const strings = stuff.map((thing: any) => {
      if (typeof thing === 'string') {
        return span(thing);
      }

      if (typeof thing === 'number') {
        return span(thing + '');
      }

      if (typeof thing === 'function') {
        return span('function');
      }

      if (!thing) {
        return span(`false like: (${thing})`);
      }

      const c = createElement<HTMLElement>('code');
      c.innerHTML = JSON.stringify(stuff, null, 4).replace('\n', '<br />');

      return c;
    });

    return strings;
  };

  const stuffToHtml = (el: HTMLElement) => root.appendChild(el);

  return {
    error(...stuff: any[]) {
      root.innerHTML = '';
      log('❗', ...stuff).forEach(stuffToHtml)
    }, 
    log(...stuff: any[]) {
      root.innerHTML = '';
      return log('👍', ...stuff).forEach(stuffToHtml);
    }, 
    warn(...stuff: any[]) {
      root.innerHTML = '';
      return log('⚠', ...stuff).forEach(stuffToHtml);
    }, 
  };
}
