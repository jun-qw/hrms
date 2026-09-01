---
tags: [hrms, module, issues]
route: /issues
created: 2026-03-09
---

# HR이슈 관리

> 경로: `/issues`, `/issues/[id]`, `/issues/new` | 파일: `src/app/issues/`

## 개요

인사 관련 이슈(정책, 준수, 분쟁, 성과, 교육)를 등록하고 우선순위별로 추적/해결한다.

## 주요 기능

- **통계**: 전체, 미해결, 진행중, 긴급
- **필터**: 유형, 상태, 우선순위
- **이슈 카드**: 우선순위별 테두리 색상
- **이슈 상세** (`/issues/[id]`)
- **이슈 등록** (`/issues/new`)

## 이슈 유형

| 유형 | 코드 |
|------|------|
| 정책 | `policy` |
| 준수 | `compliance` |
| 분쟁 | `dispute` |
| 성과 | `performance` |
| 교육 | `training` |

## 우선순위

| 등급 | 코드 | 색상 |
|------|------|------|
| 긴급 | `critical` | 빨강 |
| 높음 | `high` | 주황 |
| 중간 | `medium` | 황색 |
| 낮음 | `low` | 회색 |

## 이슈 상태

| 상태 | 코드 |
|------|------|
| 열림 | `open` |
| 진행중 | `in_progress` |
| 검토중 | `under_review` |
| 해결 | `resolved` |
| 종료 | `closed` |

## 데이터 의존성

- [[Zustand 스토어#issue-store|issue-store]]

## 관련 모듈

- [[인사정보 관리]] | [[전자결재]]
