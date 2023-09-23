/* eslint-disable react/no-unused-prop-types */
import hljs from 'highlight.js';
import Fuse from 'fuse.js';
import * as sock from 'websocket';
import { ReactNode, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { VscListSelection } from 'react-icons/vsc';
import axios from 'axios';
import { FiMaximize, FiMinimize } from 'react-icons/fi';
import { ViewportList } from 'react-viewport-list';
import Anser from 'anser';
import { ISearchInfProps, parseError, useSearch } from './utils';

export interface IHighlightJsLog {
  websocket?: boolean;
  websocketOptions?: {
    formatMessage?: (msg: any) => string;
  };
  follow?: boolean;
  url?: string;
  text?: string;
  enableSearch?: boolean;
  selectableLines?: boolean;
  title?: string;
  height?: string;
  width?: string;
  noScrollBar?: boolean;
  maxLines?: number;
  fontSize?: number;
  loadingComponent?: ReactNode;
  actionComponent?: ReactNode;
  hideLines?: boolean;
  dark?: boolean;
  language?: string;
  searchThreshold?: number;
  removeDefaultTheme?: boolean;
}

const HighlightJsLog = ({
  websocket,
  websocketOptions = {
    formatMessage(msg) {
      return msg;
    },
  },
  follow = true,
  url,
  text = '',
  enableSearch,
  selectableLines,
  title,
  height = '400px',
  width = '600px',
  noScrollBar,
  maxLines,
  fontSize = 14,
  loadingComponent,
  actionComponent,
  hideLines,
  dark,
  language = 'accesslog',
  searchThreshold = 0.4,
  removeDefaultTheme = false,
}: IHighlightJsLog) => {
  const [data, setData] = useState(text);
  const { formatMessage } = websocketOptions;
  const [isLoading, setIsLoading] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);

  useEffect(() => {
    setData(text);
  }, [text]);

  useEffect(() => {
    (async () => {
      if (!url || websocket) return;
      setIsLoading(true);
      try {
        const d = await axios({
          url,
          method: 'GET',
        });
        setData((d.data || '').trim());
      } catch (err) {
        setData(
          `${parseError(err).message}
An error occurred attempting to load the provided log.
Please check the URL and ensure it is reachable.
${url}`
        );
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!url || !websocket) return;

    let wsclient;
    setIsLoading(true);
    try {
      /* eslint-disable new-cap */
      wsclient = new sock.w3cwebsocket(url, '', '', {});
    } catch (err) {
      setIsLoading(false);
      setData(
        `${parseError(err).message}
An error occurred attempting to load the provided log.
Please check the URL and ensure it is reachable.
${url}`
      );
      return;
    }
    // wsclient.onopen = logger.log;
    // wsclient.onclose = logger.log;
    // wsclient.onerror = logger.log;

    wsclient.onmessage = (msg) => {
      try {
        const m = formatMessage ? formatMessage(msg.data) : msg;
        setData((s) => `${s}${m ? `\n${m}` : ''}`);
        setIsLoading(false);
      } catch (err) {
        console.log(err);
        setData("'Something went wrong! Please try again.'");
      }
    };
  }, []);

  useEffect(() => {
    const keyDownListener = (e: any) => {
      if (e.code === 'Escape') {
        e.stopPropagation();
        setFullScreen(false);
      }
    };

    if (fullScreen && window?.document?.children[0]) {
      // @ts-ignore
      window.document.children[0].style = `overflow-y:hidden`;

      document.addEventListener('keydown', keyDownListener);
    } else if (window?.document?.children[0]) {
      // @ts-ignore
      window.document.children[0].style = `overflow-y:auto`;

      document.removeEventListener('keydown', keyDownListener);
    }
  }, [fullScreen]);

  return (
    <div
      className={classNames('rhljst', {
        rhljstdt: !removeDefaultTheme,
      })}
    >
      <div
        className={classNames('hljs-logs', {
          'fixed w-full h-full left-0 top-0 z-[999] hljs': fullScreen,
        })}
        style={{
          width: fullScreen ? '100vw' : width,
          height: fullScreen ? '100vh' : height,
        }}
      >
        {isLoading ? (
          loadingComponent || (
            <div className="hljs p-2 rounded-md flex flex-col gap-2 items-center justify-center h-full">
              <code className="">
                <HighlightIt language={language} inlineData="Loading..." />
              </code>
            </div>
          )
        ) : (
          <LogBlock
            {...{
              searchThreshold,
              data,
              title,
              maxLines,
              fontSize: fontSize || 14,
              actionComponent: (
                <div className="flex gap-4">
                  <div
                    onClick={() => setFullScreen((s) => !s)}
                    className="flex items-center justify-center font-bold text-xl cursor-pointer select-none active:translate-y-[1px] transition-all"
                  >
                    {fullScreen ? <FiMinimize /> : <FiMaximize />}
                  </div>
                  {actionComponent}
                </div>
              ),
              width: fullScreen ? '100vw' : width,
              height: fullScreen ? '100vh' : height,
              language,
              dark: !!dark,
              follow: !!follow,
              enableSearch: !!enableSearch,
              selectableLines: !!selectableLines,
              hideLines: !!hideLines,
              noScrollBar: !!noScrollBar,
            }}
          />
        )}
      </div>
    </div>
  );
};
interface IHighlightIt {
  language: string;
  inlineData: string;
  className?: string;
  disableHl?: boolean;
}

const HighlightIt = ({
  language,
  inlineData = '',
  className = '',
  disableHl = false,
}: IHighlightIt) => {
  const ref = useRef(null);
  const data = Anser.ansiToText(inlineData);

  useEffect(() => {
    (async () => {
      if (ref.current) {
        if (!disableHl) {
          // if (!isScrolledIntoView(ref.current)) return;
          // @ts-ignore
          ref.current.innerHTML = hljs.highlight(
            data,
            {
              language,
            },
            false
          ).value;
        } else {
          // @ts-ignore
          ref.current.innerHTML = Anser.ansiToHtml(inlineData);
        }

        // @ts-ignore
      }
    })();
  }, [inlineData, language]);

  return (
    <div ref={ref} className={classNames(className, 'inline')}>
      {data}
    </div>
  );
};

interface HighlightProps {
  value: string;
  indices: Array<[number, number]>;
}

const Highlighter: React.FC<HighlightProps> = ({ value, indices }) => {
  let lastIndex = 0;
  const parts = [];

  indices.forEach(([start, end]) => {
    if (lastIndex !== start) {
      parts.push(
        <span style={{ opacity: 0.7 }} key={lastIndex}>
          <HighlightIt
            language="accesslog"
            inlineData={value.substring(lastIndex, start)}
          />
        </span>
      );
    }
    parts.push(
      <span className="font-bold" key={start}>
        <HighlightIt
          language="accesslog"
          inlineData={value.substring(start, end + 1)}
        />
      </span>
    );
    lastIndex = end + 1;
  });

  if (lastIndex !== value.length) {
    parts.push(<span key={lastIndex}>{value.substring(lastIndex)}</span>);
  }

  return parts;
};

const InlineSearch = ({
  inlineData = '',
  className = '',
  language,
  searchText,
  searchThreshold,
}: IFilterdHighlightIt) => {
  const res = useSearch(
    {
      data: [{ message: inlineData }],
      keys: ['message'],
      searchText,
      threshold: searchThreshold,
      remainOrder: true,
    },
    [inlineData, searchText]
  );

  if (res.length && res[0].searchInf.matches?.length) {
    const def: Fuse.RangeTuple[] = [];
    return (
      <Highlighter
        {...{
          value: inlineData,
          indices:
            res[0].searchInf.matches?.reduce((acc, curr) => {
              return [...acc, ...curr.indices];
            }, def) || def,
        }}
      />
    );
  }
  return (
    <HighlightIt
      {...{
        inlineData,
        language,
        className: classNames(className, {
          'opacity-40': !!searchText,
        }),
        enableHL: true,
      }}
    />
  );
};

interface IFilterdHighlightIt {
  searchInf?: ISearchInfProps['searchInf'];
  inlineData: string;
  className?: string;
  language: string;
  searchText: string;
  showAll: boolean;
  searchThreshold: number;
}

const FilterdHighlightIt = ({
  searchInf,
  inlineData = '',
  className = '',
  language,
  searchText,
  showAll,
  searchThreshold,
}: IFilterdHighlightIt) => {
  const def: Fuse.RangeTuple[] = [];

  if (showAll) {
    return (
      <div className={classNames('whitespace-pre', className)}>
        <InlineSearch
          {...{
            searchThreshold,
            language,
            inlineData,
            searchText,
            className,
            showAll,
          }}
        />
      </div>
    );
  }

  return (
    <div className={classNames('whitespace-pre', className)}>
      {searchInf?.matches?.length ? (
        <Highlighter
          key={inlineData}
          {...{
            value: inlineData,
            indices: searchInf.matches.reduce((acc, curr) => {
              // const validIndices = curr.indices.filter((i) => {
              //   return i[1] - i[0] >= searchText.length - 1;
              // });
              // console.log(curr.indices, validIndices);
              return [...acc, ...curr.indices];
            }, def),
          }}
        />
      ) : (
        <HighlightIt
          {...{
            inlineData,
            language,
            enableHL: true,
          }}
        />
      )}
    </div>
  );
};

const padLeadingZeros = (num: number, size: number) => {
  let s = `${num}`;
  while (s.length < size) s = `0${s}`;
  return s;
};

interface ILogLine {
  log: {
    line: string;
    lineNumber: number;
  } & {
    searchInf?: ISearchInfProps['searchInf'];
  };

  language: string;
  fontSize: number;
  lines: number;
  showAll: boolean;
  searchText: string;
  selectableLines: boolean;
  hideLines: boolean;
  dark: boolean;
  searchThreshold: number;
}

const LogLine = ({
  log,
  lines,
  hideLines,
  fontSize,
  selectableLines,
  showAll,
  searchText,
  language,
  dark,
  searchThreshold,
}: ILogLine) => {
  return (
    <code
      className={classNames(
        'flex py-xs items-center whitespace-pre border-b border-transparent transition-all',
        {
          'cursor-pointer': selectableLines,
          'hover:bg-[#333]': selectableLines && dark,
          'hover:bg-[#eee]': selectableLines && !dark,
        }
      )}
      style={{
        fontSize,
        paddingLeft: fontSize / 4,
        paddingRight: fontSize / 2,
      }}
    >
      {!hideLines && (
        <LineNumber
          dark={dark}
          lineNumber={log.lineNumber}
          lines={lines}
          fontSize={fontSize}
        />
      )}

      <div
        className="w-[3px] mr-4 ml-2 h-full"
        style={{ background: dark ? '#890' : '#098' }}
      />
      <div className="inline-flex gap-xl">
        <FilterdHighlightIt
          {...{
            searchThreshold,
            searchText,
            inlineData: log.line,
            searchInf: log.searchInf,
            language,
            showAll,
          }}
        />
      </div>
    </code>
  );
};

interface ILineNumber {
  lineNumber: number;
  fontSize: number;
  lines: number;
  dark: boolean;
}
const LineNumber = ({ lineNumber, fontSize, lines, dark }: ILineNumber) => {
  const ref = useRef(null);
  const [data, setData] = useState(() => padLeadingZeros(1, `${lines}`.length));

  useEffect(() => {
    setData(padLeadingZeros(lineNumber, `${lines}`.length));
  }, [lines, lineNumber]);
  return (
    <code
      key={`ind+${lineNumber}`}
      className="inline-flex gap-xl items-center whitespace-pre"
      ref={ref}
    >
      <span className="flex sticky left-0" style={{ fontSize }}>
        <HighlightIt
          inlineData={data}
          language="accesslog"
          className={classNames('border-b border-border-tertiary px-2', {
            'bg-[#333]': dark,
            'bg-[#eee]': !dark,
          })}
        />
        <div className="hljs" />
      </span>
    </code>
  );
};

interface ILogBlock {
  data: string;
  follow: boolean;
  enableSearch: boolean;
  selectableLines: boolean;
  title?: string;
  noScrollBar: boolean;
  maxLines?: number;
  fontSize: number;
  actionComponent: JSX.Element;
  hideLines: boolean;
  language: string;
  dark: boolean;
  searchThreshold: number;
}

const LogBlock = ({
  data = '',
  follow,
  enableSearch,
  selectableLines,
  title,
  noScrollBar,
  maxLines,
  fontSize,
  actionComponent,
  hideLines,
  language,
  dark,
  searchThreshold,
}: ILogBlock) => {
  const lines = data
    .split('\n')
    .map((line, i) => ({ line, lineNumber: i + 1 }));

  const [searchText, setSearchText] = useState('');

  const searchResult = useSearch(
    {
      data: lines,
      keys: ['line'],
      searchText,
      threshold: searchThreshold,
    },
    [data, searchText]
  );

  const [showAll, setShowAll] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    (async () => {
      if (follow && ref.current) {
        // @ts-ignore
        ref.current.scrollTo(0, ref.current.scrollHeight);
      }
    })();
  }, [data, maxLines]);

  return (
    <div
      className={classNames('hljs p-2 rounded-md flex flex-col gap-2 h-full', {
        border: !dark,
      })}
    >
      <div className="flex justify-between px-2 items-center border-b border-gray-500 pb-3">
        <div className="">{title}</div>

        <div className="flex items-center gap-3">
          {actionComponent}
          {enableSearch && (
            <form
              className="flex gap-3 items-center text-sm"
              onSubmit={(e) => {
                e.preventDefault();
                setShowAll((s) => !s);
              }}
            >
              <input
                className="bg-transparent border border-gray-400 rounded-md px-2 py-0.5 w-[10rem]"
                placeholder="Search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <div
                onClick={() => {
                  setShowAll((s) => !s);
                }}
                className="cursor-pointer active:translate-y-[1px] transition-all"
              >
                <VscListSelection
                  className={classNames('font-medium', {
                    'text-gray-200': !showAll,
                    'text-gray-600': showAll,
                  })}
                />
              </div>
            </form>
          )}
        </div>
      </div>
      <div
        className={classNames('flex flex-1 overflow-auto', {
          'no-scroll-bar': noScrollBar,
          'hljs-log-scrollbar': !noScrollBar,
        })}
      >
        <div className="flex flex-1 h-full">
          <div
            className="flex-1 flex flex-col pb-8"
            style={{ lineHeight: `${fontSize * 1.5}px` }}
            ref={ref}
          >
            <ViewportList items={showAll ? lines : searchResult}>
              {(log) => {
                return (
                  <LogLine
                    searchThreshold={searchThreshold}
                    log={log}
                    language={language}
                    searchText={searchText}
                    fontSize={fontSize}
                    lines={searchResult.length}
                    showAll={showAll}
                    key={log.lineNumber}
                    hideLines={hideLines}
                    selectableLines={selectableLines}
                    dark={dark}
                  />
                );
              }}
            </ViewportList>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HighlightJsLog;
