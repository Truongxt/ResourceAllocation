# Kết quả thực nghiệm cho bài báo SSRC-II'2026 (chạy ngày 20/11/2026, Linux 2 nhân, Node.js 22)

Tái lập: `RAO=<thư mục gốc> node baselines-raw.js` (Bảng I), `RAO=<thư mục gốc> node theta.js` (Bảng II, Hình 2), rồi `python3 analyze.py` (cần scipy) trong cùng thư mục với hai file .json. Bảng III: `npm run measure:csp-soft` trong server/.

`ga-vs-hybrid.js` là thí nghiệm của bản nháp đầu, đã được thay bằng `theta.js`.

```
=== Bảng I: mean ± sd, và Wilcoxon Hybrid vs others (fitness, overalloc)
small greedy n 30 f 0.767 ± 0.051 s 94.833 ± 3.153 sig 16.789 ± 8.403 o 1.067 ± 0.929 cs 3.967 ± 0.795 ms 1
small csp n 23 f 0.800 ± 0.023 s 92.913 ± 3.550 sig 15.757 ± 6.281 o 0.000 ± 0.000 cs 2.478 ± 0.827 ms 2
small genetic n 30 f 0.824 ± 0.021 s 87.033 ± 4.970 sig 3.523 ± 1.683 o 0.033 ± 0.180 cs 4.300 ± 0.640 ms 562
small hybrid n 30 f 0.819 ± 0.038 s 93.167 ± 3.578 sig 9.620 ± 9.236 o 0.233 ± 0.423 cs 4.200 ± 0.702 ms 330
  small Hybrid vs greedy: fitness p=2.56e-06 (thắng 29, thua 0, hòa 1); quá tải p=1.94e-04 (thắng 0, thua 17, hòa 13)
  small Hybrid vs genetic: fitness p=6.70e-01 (thắng 16, thua 14, hòa 0); quá tải p=1.43e-02 (thắng 6, thua 0, hòa 24)
  small Hybrid vs CSP (n=23 bộ CSP giải được): fitness p=2.38e-07 (thắng 23, thua 0, hòa 0)
medium greedy n 30 f 0.751 ± 0.018 s 98.033 ± 0.752 sig 34.232 ± 6.346 o 7.767 ± 1.499 cs 54.500 ± 3.212 ms 2
medium csp n 14 f 0.828 ± 0.013 s 94.500 ± 1.296 sig 17.255 ± 3.552 o 0.071 ± 0.258 cs 33.857 ± 3.044 ms 16
medium genetic n 30 f 0.697 ± 0.018 s 61.733 ± 4.343 sig 38.183 ± 13.311 o 1.733 ± 0.772 cs 58.167 ± 3.397 ms 5983
medium hybrid n 30 f 0.803 ± 0.013 s 91.700 ± 1.696 sig 36.307 ± 10.016 o 1.600 ± 0.757 cs 58.100 ± 3.448 ms 4938
  medium Hybrid vs greedy: fitness p=1.86e-09 (thắng 30, thua 0, hòa 0); quá tải p=1.38e-06 (thắng 0, thua 30, hòa 0)
  medium Hybrid vs genetic: fitness p=1.73e-06 (thắng 30, thua 0, hòa 0); quá tải p=2.76e-01 (thắng 3, thua 10, hòa 17)
  medium Hybrid vs CSP (n=14 bộ CSP giải được): fitness p=8.54e-04 (thắng 2, thua 12, hòa 0)
=== Bảng II (ga-vs-hybrid)
small fitness p=2.43e-02 (thắng 12, thua 18, hòa 0) cg p=2.33e-06 (thắng 2, thua 28, hòa 0)
medium fitness p=1.73e-06 (thắng 30, thua 0, hòa 0) cg p=2.85e-01 (thắng 13, thua 17, hòa 0)
=== θ
small ga f 0.821 ± 0.024 s 85.9 sig 4.1 o 0.07 cg 27.2 gen 101.4 ms 594 
small hy0 f 0.823 ± 0.023 s 85.8 sig 3.7 o 0.03 cg 29.5 gen 114.1 ms 656  pairs 100.0% reopened 0.00
   vs GA p=4.17e-01 (thắng 14, thua 15, hòa 1)
small hy0.25 f 0.817 ± 0.034 s 90.9 sig 10.4 o 0.20 cg 16.0 gen 74.9 ms 431  pairs 48.1% reopened 0.00
   vs GA p=8.39e-01 (thắng 18, thua 12, hòa 0)
small hy0.5 f 0.804 ± 0.040 s 93.4 sig 13.8 o 0.47 cg 6.3 gen 62.1 ms 356  pairs 36.4% reopened 0.00
   vs GA p=5.38e-03 (thắng 11, thua 19, hòa 0)
CURVE small ga (0,0.6534) (10,0.7767) (20,0.8051) (30,0.8133) (40,0.8148) (50,0.8174) (60,0.8179) (70,0.8191) (80,0.8198) (90,0.8201) (100,0.8201) (110,0.8201) (120,0.8205) (130,0.8206) (140,0.8206) (150,0.8206) (160,0.8208) (170,0.8208) (180,0.8208) (190,0.8208) (200,0.8208) (210,0.8208) (220,0.8208) (230,0.8208) (240,0.8208) (250,0.8208)
CURVE small hy0.5 (0,0.7808) (10,0.8029) (20,0.8036) (30,0.8037) (40,0.8043) (50,0.8043) (60,0.8043) (70,0.8043) (80,0.8043) (90,0.8043) (100,0.8043) (110,0.8043) (120,0.8043) (130,0.8043) (140,0.8043) (150,0.8043) (160,0.8043) (170,0.8043) (180,0.8043) (190,0.8043) (200,0.8043) (210,0.8043) (220,0.8043) (230,0.8043) (240,0.8043) (250,0.8043)
medium ga f 0.699 ± 0.017 s 61.6 sig 37.1 o 1.53 cg 92.0 gen 192.3 ms 5632 
medium hy0 f 0.697 ± 0.018 s 60.9 sig 38.5 o 1.67 cg 87.4 gen 187.6 ms 5636  pairs 100.0% reopened 0.00
   vs GA p=4.96e-01 (thắng 12, thua 17, hòa 1)
medium hy0.25 f 0.786 ± 0.016 s 84.7 sig 35.8 o 1.17 cg 87.8 gen 183.2 ms 5659  pairs 42.0% reopened 0.00
   vs GA p=1.86e-09 (thắng 30, thua 0, hòa 0)
medium hy0.5 f 0.816 ± 0.012 s 92.4 sig 28.9 o 1.13 cg 90.7 gen 196.1 ms 5713  pairs 29.2% reopened 0.00
   vs GA p=1.73e-06 (thắng 30, thua 0, hòa 0)
CURVE medium ga (0,0.5559) (10,0.6140) (20,0.6410) (30,0.6543) (40,0.6638) (50,0.6712) (60,0.6763) (70,0.6802) (80,0.6814) (90,0.6847) (100,0.6872) (110,0.6889) (120,0.6911) (130,0.6921) (140,0.6931) (150,0.6943) (160,0.6949) (170,0.6959) (180,0.6966) (190,0.6970) (200,0.6976) (210,0.6981) (220,0.6982) (230,0.6984) (240,0.6987) (250,0.6994)
CURVE medium hy0.5 (0,0.7393) (10,0.7765) (20,0.7902) (30,0.7957) (40,0.8006) (50,0.8035) (60,0.8048) (70,0.8062) (80,0.8078) (90,0.8093) (100,0.8101) (110,0.8114) (120,0.8120) (130,0.8127) (140,0.8129) (150,0.8132) (160,0.8137) (170,0.8140) (180,0.8142) (190,0.8145) (200,0.8148) (210,0.8152) (220,0.8156) (230,0.8158) (240,0.8162) (250,0.8162)
```
