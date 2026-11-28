import { useOutletContext } from 'react-router-dom';

export interface ReaderContextValue {
  isSignedIn: boolean;
  /** Mở trang đăng nhập rồi quay lại trang hiện tại. */
  requestLogin: () => void;
}

export const useReaderContext = () => useOutletContext<ReaderContextValue>();
