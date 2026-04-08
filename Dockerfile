FROM nginx:stable-alpine

# 기본 설정 파일 삭제 후 작성한 설정 복사
RUN rm /etc/nginx/conf.d/default.conf
COPY default.conf /etc/nginx/conf.d/default.conf

# 호스트의 dist 폴더 내용을 Nginx 기본 경로로 복사
# (docker build 실행 위치 기준)
COPY ./dist /usr/share/nginx/html

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
