import { configure } from '@testing-library/react-native';

// `findBy*` mặc định chỉ chờ 1 giây. Lần chạy đầu khi jest chưa có cache biến dịch, màn đầu
// tiên của bộ có thể dựng chậm hơn thế và đỏ oan.
configure({ asyncUtilTimeout: 5000 });
