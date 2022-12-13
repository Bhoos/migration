import assert from "assert";

export type Cursor = {
  str: string;
  pos: number;
  match: string | false;
};

function copyCursor(cur: Cursor) {
  return { str : cur.str , pos: cur.pos , match : cur.match};
}

function copyCursorInto(into : Cursor, fromm : Cursor) {
  into.str = fromm.str;
  into.pos = fromm.pos;
  into.match  = fromm.match;
  return into;
}

function isWhiteSpaceChar(char : string) {
  const isws = (char === " "  || char === "\n" || char === "\r" || char === "\t");
  return isws;
}

export function consumeEnclosedBy(cur: Cursor, startChar: string, endChar: string) {
  // the case where startChar == endChar is tricky. Be aware of that.
  let count = 0;
  let startPos = null;
  let endPos = cur.pos;
  for (let i = cur.pos; i < cur.str.length; i++) {
    const char = cur.str[i];
    if (char === startChar) {
      if (char === endChar && count != 0) {
        endPos = i; break;
      }
      if (count === 0) startPos = i + 1;
      count++;
    } else if (char === endChar) {
      count--;
      if (count === 0) {
        endPos = i;
        break;
      }
    } else if (startPos === null && !isWhiteSpaceChar(char)) {
      cur.match = '';
      break;
    }
  }
  if (startPos != null)
    cur.pos = endPos +1;
  cur.match = startPos ? cur.str.substring(startPos, endPos) : false;
}

export function matchRegExp(cur: Cursor, regExp: RegExp, group: number = 0) {
  regExp.lastIndex = cur.pos;
  const match = regExp.exec(cur.str);
  if (match)
    cur.pos = regExp.lastIndex;
  cur.match = match ? match[group] : false;
  return cur;
}

export function consumeSpaces(cur:Cursor) {
  return matchRegExp(cur, /\s*/g);
}

export function consumeCommaAndSpaces(cur: Cursor) {
  for (let i = cur.pos; i < cur.str.length; i++) {
    const char = cur.str[i];
    if (isWhiteSpaceChar(char)) {
    } else if (char === ",") {
      cur.pos = i+1;
      return;
    } else {
      return;
    }
  }
}

export function consumeAlphabets(cur: Cursor) {
  return matchRegExp(cur, /\s*([A-z]*)/g, 1);
}

export function consumeWord(cur : Cursor, word : string, caseSensitive : boolean = false){
  consumeAlphabets(cur);
  assert(cur.match);
  if (caseSensitive) {
    assert(cur.match === word);
  } else {
    assert(cur.match.toLowerCase() === word.toLowerCase());
  }
  return cur;
}


export function getMatch(cur: Cursor, func : (c : Cursor) => any){
  let error = null;
  try {
    func(cur)
  } catch (err) {
    cur.match == null
    error = err;
  }
  if (!cur.match) {
    throw new Error('Failed to get match for ' + func.name + ' at cursor ' + JSON.stringify(cur) + '\n Error is ' + JSON.stringify(error));
  }
  return cur.match;
}

export function consumeNameInsideBrackets(cur : Cursor) {
  const _name = getMatch(cur, (cur) => consumeEnclosedBy(cur, "(", ")"));
  const name = getMatch({str : _name, pos: 0, match : null}, consumePgName);
  return name;
}
export function consumeValue(cur : Cursor) {
  // TODO: doesn't support all kinds of expressions
  // check https://www.postgresql.org/docs/current/sql-createfunction.html #default_expr
  consumeEnclosedBy(cur, "(", ")");
  if (cur.match != "") return cur;
  return matchRegExp(cur, /\s*([A-z0-9_])/g, 1);
}

export function consumePgName(cur: Cursor) {
  // From: https://www.postgresql.org/docs/7.0/syntax525.htm
  // Names in SQL must begin with a letter (a-z) or underscore (_).
  // Subsequent characters in a name can be letters, digits (0-9), or underscores
  // Names containing other characters may be formed by surrounding them with double quotes (").
  // For example, table or column names may contain otherwise disallowed characters such as spaces, ampersands, etc. if quoted.
  consumeEnclosedBy(cur, '"', '"');
  if (cur.match != "") {
    return cur; // string enclosed by "s is a pg name
  } else {
    consumeSpaces(cur);
    return matchRegExp(cur, /([A-z_][A-z_0-9]*)/g, 1);
  }
}

export function consumeTypeName(cur:Cursor) {
  // https://www.postgresql.org/docs/current/datatype.html
  consumePgName(cur);
  if (!cur.match) throw new Error(`Type of not specified at pos ${cur.pos}`);
  const lcase = cur.match.toLowerCase();
  if (lcase === "character" || lcase === "bit") {
    const backup = copyCursor(cur);
    consumeAlphabets(cur);
    if (cur.match.toLowerCase() === "varying") {
      consumeEnclosedBy(cur, "(", ")");
      cur.match = lcase + " varying";
      return;
    } else {
      consumeEnclosedBy(cur, "(", ")");
      return copyCursorInto(cur, backup);
    }
  } else if (lcase === "double") {
    consumeAlphabets(cur);
    if (cur.match != "precision") throw new Error(`There is no type called 'double'. You probably mean 'double precision'`);
    consumeEnclosedBy(cur, "(", ")");
    cur.match = "double precision";
    return;
  } else if (lcase === "time" || lcase === "timestamp") {
    consumeEnclosedBy(cur, "(", ")"); // ignore timestamp miliseconds precision
    if (cur.match)
      console.error("Ignoring timestamp precision", cur.match, 'at', cur.pos);

    matchRegExp(cur, /\s*without\s*time\s*zone/gi);
    if (cur.match) {
      cur.match = lcase;
      return;
    }
    matchRegExp(cur, /\s*with\s*time\s*zone/gi);
    if (cur.match){
      cur.match = lcase+'tz'; // timetz or timestamptz
      return;
    }
    cur.match = lcase;
    return;
  } else if (lcase === "numeric" || lcase === "interval") {
    consumeEnclosedBy(cur, "(", ")"); // ignore timestamp miliseconds precision
    if (cur.match)
      console.error("Ignoring ${lcase} presion", cur.match, 'at', cur.pos);
    cur.match = lcase;
    return;
  } else if (lcase === 'interval') {
    throw new Error('Cannot handle `interval` type');
  }

  let typeName = cur.match;
  consumeEnclosedBy(cur, "(", ")"); // ignore () e.g. varchar(32)
  matchRegExp(cur, /(\s*\[\])*/g); // capture array spec.
  if (cur.match)
    typeName = typeName + cur.match;
  cur.match = typeName;
}

export function debugCursor(cur: Cursor, message : string = '') {
  console.log(`\n${message} Cursor pos:`, cur.pos, " match: ", cur.match);
  for (let i = 0; i < cur.str.length; i++) {
    if (i === cur.pos) {
      process.stdout.write("[[");
    }
    process.stdout.write(cur.str[i]);
    if (i === cur.pos) {
      process.stdout.write("]]");
    }
  }
}

export function consumeCommentIfExists(cur: Cursor, ignoreChars : string = ',') {
  let endPos = cur.str.length-1;
  let comment = false;
  let startPos = 0;
  for (let i = cur.pos; i < cur.str.length; i++) {
    const char = cur.str[i];
    if (char === '\n' || char === '\r') {
      endPos = i;
      break;
    } else if (char == '-') {
      comment = true;
    } else if (!isWhiteSpaceChar(char) && !ignoreChars.includes(char)) {
      if (!comment) {
        break;
      }
      if (startPos === 0) {
        startPos = i;
      }
    }
  }
  if (startPos != 0) {
    const match = cur.str.substring(startPos, endPos);
    cur.pos = endPos + 1;
    consumeCommentIfExists(cur);
    cur.match = match + (cur.match ? `\n${cur.match}` : '');
  } else {
    cur.match = false;
  }
  return cur;
}

export function consumeDefaultValIfExists(cur: Cursor) {
  const pos = cur.pos;
  consumeAlphabets(cur);
  if (cur.match && cur.match.toLocaleLowerCase() === 'default') {
    const defaultValue = consumeValue(cur).match;
    return defaultValue;
  } else {
    cur.pos = pos;
  }
}

// Run a function `f` that moves the cursor `cur` until it returs null.
// collect and return all the function return values
export function collectUntillNull<T>(cur: Cursor, f: (c: Cursor) => T): T[] {
  let result: T[] = [];
  let r;
  do {
    r = f(cur);
    if (r) result.push(r);
  } while (r);
  return result;
}
