export default class StravaApi {
  apiUrl: string;
  promises: any;

  constructor(url: string, private backendSrv: any) {
    this.apiUrl = url;
    this.promises = {};
  }

  async getAuthenticatedAthlete(params?: any) {
    return await this.request('athlete', params);
  }

  async getActivities(params?: any) {
    return await this.requestWithPagination('activities', params);
  }

  async requestWithPagination(url: string, params?: any) {
    let data = [];
    let chunk = [];
    let page = 1;
    const limit = params && params.limit;
    const per_page = params && params.per_page || 200;
    while (!(chunk.length === 0 && page !== 1) && !(limit && data.length >= limit)) {
      params = {
        ...params,
        per_page,
        page,
      };
      try {
        chunk = await this.request(url, params);
      } catch (error) {
        throw error;
      }
      data = data.concat(chunk);
      page++;
    }
    return data;
  }

  async request(url: string, params?: any) {
    return this.proxyfy(this._request, '_request', this)(url, params);
  }

  async _request(url: string, params?: any) {
    try {
      const response = await this.backendSrv.datasourceRequest({
        url: `${this.apiUrl}/strava/${url}`,
        method: 'GET',
        params,
      });
      return response.data;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  proxyfy(func, funcName, funcScope) {
    if (!this.promises[funcName]) {
      this.promises[funcName] = {};
    }
    const promiseKeeper = this.promises[funcName];
    return callOnce(func, promiseKeeper, funcScope);
  }
}

/**
 * Wrap request to prevent multiple calls
 * with same params when waiting for result.
 */
function callOnce(func, promiseKeeper, funcScope): (...args: any[]) => any {
  return function() {
    var hash = getRequestHash(arguments);
    if (!promiseKeeper[hash]) {
      promiseKeeper[hash] = Promise.resolve(
        func.apply(funcScope, arguments)
        .then(result => {
          promiseKeeper[hash] = null;
          return result;
        })
      );
    }
    return promiseKeeper[hash];
  };
}

function getRequestHash(args) {
  const argsJson = JSON.stringify(args);
  return getHash(argsJson);
}

function getHash(srt: string) {
  var hash = 0, i, chr, len;
  if (srt.length !== 0) {
    for (i = 0, len = srt.length; i < len; i++) {
      chr   = srt.charCodeAt(i);
      hash  = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
  }
  return hash;
}
