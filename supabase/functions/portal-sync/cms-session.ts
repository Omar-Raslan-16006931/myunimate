// Signs into the GIU CMS (cms.giu-uni.de). It uses the same login box as the portal
// (NTLM), so the portal's own sign-in code is reused with the CMS address.

import { type Connector, PortalHttp } from "./portal.ts";
import type { CmsSession } from "./cms-sync.ts";

export interface CmsAuth {
  username: string;
  password: string;
}

export const CMS_HOST = "cms.giu-uni.de";

const okPage = (status: number, what: string) => {
  if (status === 401 || status === 403) throw new Error("PORTAL_LOGIN_FAILED");
  if (status !== 200) throw new Error(`PORTAL_HTTP_${status}_${what}`);
};

export const openCmsSession = (auth: CmsAuth, connector: Connector): Promise<CmsSession> => {
  const http = new PortalHttp(CMS_HOST, connector, auth);
  const session: CmsSession & { close(): void } = {
    async get(path) {
      const res = await http.request("GET", path);
      okPage(res.status, "CMS");
      return res.body;
    },
    async getFile(path) {
      http.accept = "*/*";
      http.referer = `https://${CMS_HOST}/apps/student/ViewAllCourseStn.aspx`;
      const res = await http.request("GET", path);
      okPage(res.status, "CMS_FILE");
      return { body: res.bytes, contentType: res.headers.get("content-type")?.[0] ?? "application/octet-stream" };
    },
    close: () => http.close(),
  };
  return Promise.resolve(session);
};
