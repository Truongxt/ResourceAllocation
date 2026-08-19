// Tiện ích dùng chung cho các bộ kiểm thử end-to-end.

export const API = `http://localhost:${process.env.TEST_PORT || 5000}/api`;
export const WS = `http://localhost:${process.env.TEST_PORT || 5000}`;

const state = { pass: 0, fail: 0, failures: [], section: '' };

export const section = (name) => {
  state.section = name;
  console.log(`\n\x1b[1m── ${name}\x1b[0m`);
};

export const ok = (condition, label, detail = '') => {
  if (condition) {
    state.pass++;
    console.log(`  \x1b[32m✓\x1b[0m ${label}${detail ? '  ' + detail : ''}`);
  } else {
    state.fail++;
    state.failures.push(`[${state.section}] ${label} ${detail}`);
    console.log(`  \x1b[31m✗ ${label}\x1b[0m  ${detail}`);
  }
};

/**
 * Gọi API và trả về { status, ...body }.
 * Dùng raw:true khi body có field trùng tên "status" (ví dụ /health).
 */
export const call = async (method, path, { token, body, raw } = {}) => {
  const res = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  return raw ? { status: res.status, json } : { status: res.status, ...json };
};

export const login = async (email, password = 'password123') => {
  const res = await call('POST', '/auth/login', { body: { email, password } });
  return res.data?.token;
};

/** In tổng kết và trả về số assertion thất bại. */
export const summary = () => {
  console.log('\n' + '═'.repeat(52));
  console.log(
    `  \x1b[32mPASS: ${state.pass}\x1b[0m    ` +
    `${state.fail ? `\x1b[31mFAIL: ${state.fail}\x1b[0m` : 'FAIL: 0'}    ` +
    `TỔNG: ${state.pass + state.fail}`
  );
  console.log('═'.repeat(52));
  if (state.failures.length) {
    console.log('\nChi tiết thất bại:');
    state.failures.forEach((f) => console.log('  - ' + f));
  }
  return state.fail;
};
