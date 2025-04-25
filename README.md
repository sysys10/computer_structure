# MIPS 시뮬레이터

React, TypeScript, MUI로 구축된 웹 기반 MIPS 어셈블리 언어 시뮬레이터입니다.

<img width="1005" alt="스크린샷 2025-04-25 오후 6 10 14" src="https://github.com/user-attachments/assets/2172e4c8-e826-463d-9186-08732ba5ce7d" />

## 개요

이 MIPS 시뮬레이터는 브라우저에서 MIPS 어셈블리 코드를 작성, 어셈블, 실행할 수 있게 해줍니다. 다음과 같은 MIPS 프로세서의 실제적인 시뮬레이션을 제공합니다:

- 레지스터 시각화
- 메모리 검사
- 단계별 실행
- 핵심 MIPS 명령어를 위한 완전한 어셈블리 지원

## 주요 기능

- **어셈블리 에디터**: MIPS 어셈블리 코드를 작성하고 편집
- **CPU 상태 표시**: 실시간으로 레지스터 값 확인 및 추적
- **메모리 뷰어**: 모든 주소의 메모리 내용 검사
- **출력 로그**: 실행 결과 및 오류 메시지 추적
- **제어 흐름**: 코드를 단계별로 실행하거나 연속적으로 실행
- **디버깅**: 어셈블리 및 런타임 문제에 대한 명확한 오류 보고

## 설치

1. 저장소 복제:

   ```bash
   git clone https://github.com/yourusername/mips-simulator.git
   cd mips-simulator
   ```

2. 종속성 설치:

   ```bash
   npm install
   ```

3. 개발 서버 시작:

   ```bash
   npm run dev
   ```

4. 프로덕션용 빌드:
   ```bash
   npm run build
   ```

## 사용법

1. 어셈블리 소스 패널에 **어셈블리 코드 작성**
2. **"Assemble & Load" 클릭**하여 코드 컴파일
3. CPU 상태 패널 사용:
   - **Step**: 한 번에 하나의 명령어 실행
   - **Run**: 연속적으로 실행
   - **Stop**: 실행 일시 중지
   - **Reset**: CPU 상태 초기화

## 지원하는 명령어

시뮬레이터는 다음을 포함한 다양한 MIPS 명령어를 지원합니다:

### R-타입 명령어

- `add`, `addu`, `sub`, `subu`
- `and`, `or`, `xor`, `nor`
- `slt`, `sltu`
- `sll`, `srl`, `sra`
- `sllv`, `srlv`, `srav`
- `jr`, `syscall`

### I-타입 명령어

- `addi`, `addiu`, `andi`, `ori`, `xori`
- `lui`
- `lw`, `sw`, `lb`, `lbu`, `lh`, `lhu`, `sb`, `sh`
- `beq`, `bne`
- `slti`, `sltiu`

### J-타입 명령어

- `j`, `jal`

### 의사 명령어(Pseudo-Instructions)

- `move`, `nop`

### 어셈블러 지시어

- `.data`, `.text`
- `.word`, `.half`, `.byte`
- `.space`, `.align`
- `.ascii`, `.asciiz`

## 메모리 레이아웃

시뮬레이터는 다음과 같은 기본 메모리 레이아웃을 사용합니다:

- **텍스트 세그먼트**: `0x00040000`에서 시작
- **데이터 세그먼트**: `0x10000000`에서 시작
- **스택 포인터**: `0x7FFFFFFC`로 초기화
- **글로벌 포인터**: `0x10008000`으로 초기화

## 예제 코드

```assembly
# 1부터 10까지 숫자의 합계를 계산하는 간단한 MIPS 프로그램
    .text
main:
    li $t0, 0          # 합계를 0으로 초기화
    li $t1, 1          # 카운터를 1로 초기화
    li $t2, 10         # 상한선을 10으로 설정

loop:
    add $t0, $t0, $t1  # 합계에 카운터 추가
    addi $t1, $t1, 1   # 카운터 증가
    ble $t1, $t2, loop # 카운터 <= 10이면 반복

    # 프로그램 종료
    li $v0, 10
    syscall
```

참고: 이 예제는 `li` 의사 명령어를 사용합니다. 현재 구현에서는 `li`를 직접 지원하지 않으므로, 다음과 동등한 코드를 사용할 수 있습니다:

```assembly
# li $t0, 123   # 의사 명령어
lui $t0, 0      # 상위 16비트 = 0
ori $t0, $t0, 123  # 하위 16비트 = 123
```

## 프로젝트 구조

- `src/models/`: 핵심 시뮬레이션 로직
  - `assembler.ts`: MIPS 어셈블리 파서 및 어셈블러
  - `cpu.ts`: CPU 시뮬레이션
  - `memory.ts`: 메모리 모델
- `src/components/`: React UI 컴포넌트
- `src/stores/`: Zustand를 사용한 상태 관리
- `src/constants/`: MIPS 명령어 정의 및 상수
- `src/types/`: TypeScript 타입 정의

## 기술적 세부사항

- **메모리 모델**: 대규모 주소 공간을 효율적으로 표현하기 위한 청크 기반 희소 메모리
- **CPU 구현**: 지연 슬롯(delay slots)을 포함한 MIPS 실행의 정확한 시뮬레이션
- **어셈블러**: 레이블 및 데이터 지시어를 지원하는 2패스 어셈블러
- **오류 처리**: 어셈블리 및 런타임 문제에 대한 포괄적인 오류 메시지

## 종속성

- React 19
- TypeScript
- Material UI (MUI) 7
- Zustand (상태 관리용)
- Vite (빌드 및 개발용)

## 기여

기여는 언제나 환영합니다! Pull Request를 자유롭게 제출해 주세요.

## 라이선스

이 프로젝트는 MIT 라이선스로 제공됩니다 - 자세한 내용은 LICENSE 파일을 참조하세요.

## 감사의 말

- MIPS 아키텍처 및 문서
- React 및 TypeScript 커뮤니티
- Material UI 라이브러리
