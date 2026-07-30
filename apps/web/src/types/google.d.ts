// Google Identity Services（載入自 index.html 的 https://accounts.google.com/gsi/client）
// 只列出這個專案有用到的最小型別，完整型別可參考官方文件：
// https://developers.google.com/identity/gsi/web/reference/js-reference

export {};

declare global {
  interface CredentialResponse {
    credential: string;
    select_by?: string;
  }

  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: CredentialResponse) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: "standard" | "icon";
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              shape?: "rectangular" | "pill" | "circle" | "square";
              width?: number;
              logo_alignment?: "left" | "center";
            },
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}
