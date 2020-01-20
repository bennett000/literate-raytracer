type SpecificationBody = () => (Promise<void> | void);


function getSpaces(number: number) {
  return (new Array(number)).fill(' ').join('');
}

function initSpec() {
  const w: any = window;
  if (w.SPEC_STATE) {
    return w.SPEC_STATE;
  }

  const SPEC_STATE = specCreateState();

  w.SPEC_STATE = SPEC_STATE;

  setTimeout(specRunDescribes, 0);
  return w.SPEC_STATE;
}

function specCreateState() {
  return {
    after: [],
    afterHistory: [],
    before: [],
    beforeHistory: [],
    descriptions: [],
    error: null,
    expectations: [],
    failures: 0,
    indent: 0,
    log: '',
    specifications: [],
  }
}

function specLog(...args: any[]) {
  const state = initSpec();
  state.log += getSpaces(state.indent) + args.join(' ');
}

function describe(description: string, body: SpecificationBody) {
  const state = initSpec();
  state.descriptions.push({
    body,
    description,
  });
}

function it(should: string, body: SpecificationBody) {
  const state = initSpec();
  state.specifications.push({
    body,
    should,
  });
}

function specRunDescribes(isBranch = false) {
  const state = initSpec();
  if (state.descriptions.length === 0) {
    if (isBranch === false) {
      if (state.failures) {
        specLog();
        console.log('Tests:\n' + state.log);
        console.warn('Testing Complete ' + state.failures + (state.failures > 1 ? ' failures' : ' failure'))
      } else {
        console.log('Tests:\n' + state.log);
        specLog('Testing Complete');
      }
    }
    return;
  }
  const suite = state.descriptions.shift();
  specLog(suite.description + '\n');

  // increment and swap the various states
  state.indent += 2;
  state.afterHistory.push(state.after.length);
  state.beforeHistory.push(state.before.length);
  const remainingSuites = state.descriptions;
  state.descriptions = [];

  try {
    suite.body();
  } catch (e) {
    state.failures += 1;
    specLog('❗ Describe Body Error: ' + e.message + '\n');
  }
  if (state.descriptions.length) {
    // branch
    const spec = state.specifications;
    state.specifications = [];
    specRunDescribes(true);
    state.specifications = spec;
  }
  specRunSpecifications();

  // decrement and restore the various states
  state.descriptions = remainingSuites;
  state.indent -= 2;
  state.after = state.after.slice(0, state.afterHistory[state.afterHistory.length - 1]);
  state.afterHistory.pop();
  state.before = state.before.slice(0, state.beforeHistory[state.beforeHistory.length - 1]);
  state.beforeHistory.pop();

  // keep iterating
  specRunDescribes(isBranch);
}

function specRunSpecifications() {
  const state = initSpec();
  if (state.specifications.length === 0) {
    specLog('Suite Complete\n');
    return;
  }
  const spec = state.specifications.shift();
  state.indent += 2;

  try {
    state.before.forEach((cb: SpecificationBody) => cb());
    spec.body();
    state.after.forEach((cb: SpecificationBody) => cb());
    const result = specRunExpectations();
    if (result.length >= 2) {
      specLog(result.slice(0, 2) + ' ' + spec.should + ': ' + result.slice(2) + '\n');
    } else {
      specLog(result + ' ' + spec.should + '\n');
    }
  } catch (e) {
    state.failures += 1;
    specLog('❗ It Body Error: ' + e.message + '\n');
    state.indent += 2;
    specLog(e.stack);
    state.indent -= 2;
  }
  state.indent -= 2;
  specRunSpecifications();
}

function specRunExpectations() {
  const state = initSpec();
  if (state.expectations.length === 0) {
    return 'No assertions in this specification';
  }
  const final = state.expectations.reduce((s: { didPass: boolean, reason: string }, e: { didPass: boolean, reason: string }) => {
    if (s.didPass === false) {
      return s;
    }
    if (e.didPass === false) {
      return e;
    }
    return s
  }, { didPass: true, reason: '' });

  state.expectations = [];

  if (final.didPass) {
    return '✅';
  }

  state.failures += 1;
  return '❌ ' + final.reason;
}

function expect(given: any) {
  const state = initSpec();
  return {
    not: {
      toBe(expected: any) {
        state.expectations.push({
          didPass: expected !== given,
          reason: `expected ${given} to strictly *not* equal ${expected}`,
        });
      },
      toThrow() {
        try {
          given();
          state.expectations.push({
            didPass: true,
            reason: '',
          });
        } catch (e) {
          state.expectations.push({
            didPass: false,
            reason: 'given function was expected not to throw, but threw with: ' + e.message || e,
          });
        }
      },
    },
    toBe(expected: any) {
      state.expectations.push({
        didPass: expected === given,
        reason: `expected ${given} to strictly equal ${expected}`,
      });
    },
    toThrow() {
      try {
        given();
        state.expectations.push({
          didPass: false,
          reason: 'given function was expected to throw (given function did not throw)',
        });
      } catch (e) {
        state.expectations.push({
          didPass: true,
          reason: '',
        });
      }
    },
  };
}

function beforeEach(callback: SpecificationBody) {
  const state = initSpec();
  state.before.push(callback);
}

function afterEach(callback: SpecificationBody) {
  const state = initSpec();
  state.after.push(callback);
}
