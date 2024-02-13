# docker build -t sqlitcloud-gateway .
# docker run -p 8090:8090 -p 4000:4000 --name sqlitecloud-gateway sqlitecloud-gateway       

# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 as base
WORKDIR /usr/src/app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# [optional] tests & build
ENV NODE_ENV=production
#RUN bun test
#RUN bun run build
RUN bun build ./src/gateway/gateway.ts --compile --outfile ./sqlitecloud-gateway.out

# copy production dependencies and source code into final image
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /usr/src/app/src ./src
COPY --from=prerelease /usr/src/app/public ./public
COPY --from=prerelease /usr/src/app/package.json .
COPY --from=prerelease /usr/src/app/sqlitecloud-gateway.out .

# run the app
USER bun

EXPOSE 4000/tcp
EXPOSE 8090/tcp

#ENTRYPOINT [ "bun", "run", "./src/gateway/gateway.ts" ]
ENTRYPOINT [ "./sqlitecloud-gateway.out" ]
